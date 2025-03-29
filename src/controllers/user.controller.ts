import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { creditService } from '../services/credit.service';
import { sessionService } from '../services/session.service';
import { logger } from '../services/logger.service';

const prisma = new PrismaClient();

export const userController = {
  // Get user profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true,
          createdAt: true,
          totalSessionsCompleted: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      logger.error(`Error getting user profile: ${error.message}`);
      res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
  },
  
  // Update user profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { name } = req.body;
      
      // Only allow updating name for now
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true
        }
      });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      logger.error(`Error updating user profile: ${error.message}`);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  },
  
  // Get user credits
  async getCredits(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const credits = await creditService.getCreditBalance(userId);
      
      res.status(200).json({ credits });
    } catch (error) {
      logger.error(`Error getting user credits: ${error.message}`);
      res.status(500).json({ error: 'Failed to retrieve credit balance' });
    }
  },
  
  // Get credit history
  async getCreditHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const history = await creditService.getCreditHistory(userId);
      
      res.status(200).json(history);
    } catch (error) {
      logger.error(`Error getting credit history: ${error.message}`);
      res.status(500).json({ error: 'Failed to retrieve credit history' });
    }
  },
  
  // Get session history
  async getSessionHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const sessions = await prisma.labSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          osType: true,
          startTime: true,
          endTime: true,
          status: true
        }
      });
      
      // Calculate duration for each session
      const sessionsWithDuration = sessions.map(session => {
        const endTime = session.endTime || new Date();
        const durationMs = endTime.getTime() - session.startTime.getTime();
        const duration = Math.floor(durationMs / (60 * 1000)); // Duration in minutes
        
        return {
          ...session,
          duration
        };
      });
      
      res.status(200).json(sessionsWithDuration);
    } catch (error) {
      logger.error(`Error getting session history: ${error.message}`);
      res.status(500).json({ error: 'Failed to retrieve session history' });
    }
  }
};
