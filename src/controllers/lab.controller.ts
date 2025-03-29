import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { gcpService } from '../services/gcp.service';
import { guacamoleService } from '../services/guacamole.service';
import { sessionService } from '../services/session.service';
import { creditService } from '../services/credit.service';
import { logger } from '../services/logger.service';

const prisma = new PrismaClient();

export const labController = {
  // Start a new lab session
  async startLabSession(req: Request, res: Response) {
    const { osType } = req.body;
    const userId = req.user.id;
    
    // Validate OS type
    if (!['Ubuntu', 'Rocky Linux', 'OpenSUSE'].includes(osType)) {
      return res.status(400).json({ error: 'Invalid OS type' });
    }
    
    try {
      // Create session record
      const session = await sessionService.createSession(userId, osType);
      
      // Deduct credit
      await creditService.deductCredit(userId, 1, `Started ${osType} lab session`);
      
      // Provision VM asynchronously
      gcpService.provisionVMAsync(session.id, osType)
        .then(() => {
          logger.info(`VM provisioned for session ${session.id}`);
        })
        .catch(error => {
          logger.error(`Failed to provision VM for session ${session.id}: ${error.message}`);
          sessionService.markSessionError(session.id);
        });
      
      return res.status(201).json({
        sessionId: session.id,
        message: 'Lab session created. VM is being provisioned.',
        status: 'provisioning'
      });
    } catch (error) {
      logger.error(`Error starting lab session: ${error.message}`);
      return res.status(500).json({ error: 'Failed to start lab session' });
    }
  },
  
  // Get active session for user
  async getActiveSession(req: Request, res: Response) {
    const userId = req.user.id;
    
    try {
      const session = await sessionService.getActiveSessionForUser(userId);
      
      if (!session) {
        return res.status(404).json({ message: 'No active session found' });
      }
      
      // Get connection URL if session is running
      let connectionUrl = null;
      if (session.status === 'running' && session.guacamoleConnectionId) {
        connectionUrl = guacamoleService.generateClientUrl(session.guacamoleConnectionId);
      }
      
      return res.status(200).json({
        session: {
          id: session.id,
          osType: session.osType,
          status: session.status,
          startTime: session.startTime,
          timeRemaining: sessionService.calculateRemainingTime(session.startTime)
        },
        connectionUrl
      });
    } catch (error) {
      logger.error(`Error getting active session: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get active session' });
    }
  },
  
  // Connect to an existing session
  async connectToSession(req: Request, res: Response) {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    try {
      // Verify session belongs to user and is active
      const session = await sessionService.getSessionById(sessionId, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.status !== 'running') {
        return res.status(400).json({ 
          error: 'Session is not running',
          status: session.status
        });
      }
      
      if (!session.guacamoleConnectionId) {
        return res.status(400).json({ error: 'Session has no connection ID' });
      }
      
      // Generate connection URL
      const connectionUrl = guacamoleService.generateClientUrl(session.guacamoleConnectionId);
      
      // Log connection attempt
      await sessionService.logSessionActivity(sessionId, 'connected', 'User reconnected to session');
      
      return res.status(200).json({ connectionUrl });
    } catch (error) {
      logger.error(`Error connecting to session: ${error.message}`);
      return res.status(500).json({ error: 'Failed to connect to session' });
    }
  },
  
  // Terminate a session
  async terminateSession(req: Request, res: Response) {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    try {
      // Verify session belongs to user
      const session = await sessionService.getSessionById(sessionId, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.status !== 'running' && session.status !== 'provisioning') {
        return res.status(400).json({ error: 'Session is not active' });
      }
      
      // Terminate VM and update session
      await gcpService.terminateVM(sessionId);
      
      // Log termination
      await sessionService.logSessionActivity(sessionId, 'terminated', 'User terminated session');
      
      return res.status(200).json({ message: 'Session terminated successfully' });
    } catch (error) {
      logger.error(`Error terminating session: ${error.message}`);
      return res.status(500).json({ error: 'Failed to terminate session' });
    }
  },
  
  // Get session status
  async getSessionStatus(req: Request, res: Response) {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    try {
      const session = await sessionService.getSessionById(sessionId, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      return res.status(200).json({
        id: session.id,
        status: session.status,
        osType: session.osType,
        startTime: session.startTime,
        endTime: session.endTime,
        timeRemaining: session.status === 'running' 
          ? sessionService.calculateRemainingTime(session.startTime)
          : 0
      });
    } catch (error) {
      logger.error(`Error getting session status: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get session status' });
    }
  }
};
