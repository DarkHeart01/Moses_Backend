import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { creditService } from '../services/credit.service';
import { gcpService } from '../services/gcp.service';
import { logger } from '../services/logger.service';

const prisma = new PrismaClient();

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

export const adminController = {
  // Get all users
  async getUsers(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', search } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Build where clause for search
      const where = search 
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } }
            ]
          }
        : {};
      
      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            credits: true,
            emailVerified: true,
            createdAt: true,
            totalSessionsCompleted: true,
            _count: {
              select: {
                sessions: true
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);
      
      res.status(200).json({
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
        if (error instanceof Error) {
            console.log(error.message);
          }
      logger.error(`Error getting users: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  },
  
  // Get user details
  async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true,
          emailVerified: true,
          createdAt: true,
          totalSessionsCompleted: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get recent sessions
      const recentSessions = await prisma.labSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: 10,
        select: {
          id: true,
          osType: true,
          startTime: true,
          endTime: true,
          status: true
        }
      });
      
      // Get credit transactions
      const creditTransactions = await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10
      });
      
      res.status(200).json({
        user,
        recentSessions,
        creditTransactions
      });
    } catch (error) {
      logger.error(`Error getting user details: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve user details' });
    }
  },
  
  // Add credits to user
  async addCredits(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid credit amount is required' });
      }
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Add credits
      await creditService.addCredit(
        userId, 
        amount, 
        description || `Admin credit allocation by ${req.user!.id}`
      );
      
      // Get updated user
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, credits: true }
      });
      
      res.status(200).json({
        message: `Added ${amount} credits to user`,
        user: updatedUser
      });
    } catch (error) {
      logger.error(`Error adding credits: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to add credits' });
    }
  },
  
  // Get all sessions
  async getAllSessions(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', status, userId } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Build where clause for filters
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      // Get sessions with pagination
      const [sessions, total] = await Promise.all([
        prisma.labSession.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: { startTime: 'desc' }
        }),
        prisma.labSession.count({ where })
      ]);
      
      res.status(200).json({
        sessions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error(`Error getting all sessions: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  },
  
  // Get session details
  async getSessionDetails(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      const session = await prisma.labSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          logs: {
            orderBy: { timestamp: 'desc' }
          }
        }
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.status(200).json(session);
    } catch (error) {
      logger.error(`Error getting session details: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve session details' });
    }
  },
  
  // Terminate session
  async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      // Check if session exists
      const session = await prisma.labSession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.status !== 'running' && session.status !== 'provisioning') {
        return res.status(400).json({ error: 'Session is not active' });
      }
      
      // Terminate VM
      await gcpService.terminateVM(sessionId);
      
      res.status(200).json({ message: 'Session terminated successfully' });
    } catch (error) {
      logger.error(`Error terminating session: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to terminate session' });
    }
  },
  
  // Get system logs
  async getSystemLogs(req: Request, res: Response) {
    try {
      const { page = '1', limit = '50', level } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // This would typically connect to Cloud Logging
      // For simplicity, we'll return session logs as an example
      const where: any = {};
      
      if (level) {
        where.action = level;
      }
      
      const [logs, total] = await Promise.all([
        prisma.sessionLog.findMany({
          skip,
          take: limitNum,
          orderBy: { timestamp: 'desc' },
          include: {
            session: {
              select: {
                id: true,
                osType: true,
                userId: true
              }
            }
          }
        }),
        prisma.sessionLog.count({ where })
      ]);
      
      res.status(200).json({
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error(`Error getting system logs: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve system logs' });
    }
  },
  
  // Get system stats
  async getSystemStats(req: Request, res: Response) {
    try {
      // Get various system statistics
      const [
        totalUsers,
        totalSessions,
        activeSessions,
        totalCreditsIssued,
        totalCreditsUsed
      ] = await Promise.all([
        prisma.user.count(),
        prisma.labSession.count(),
        prisma.labSession.count({
          where: {
            status: { in: ['pending', 'provisioning', 'running'] }
          }
        }),
        prisma.creditTransaction.aggregate({
          _sum: {
            amount: true
          },
          where: {
            amount: { gt: 0 }
          }
        }),
        prisma.creditTransaction.aggregate({
          _sum: {
            amount: true
          },
          where: {
            amount: { lt: 0 }
          }
        })
      ]);
      
      // Get session distribution by OS
      const sessionsByOS = await prisma.labSession.groupBy({
        by: ['osType'],
        _count: true
      });
      
      // Get recent sessions
      const recentSessions = await prisma.labSession.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      
      res.status(200).json({
        userStats: {
          totalUsers
        },
        sessionStats: {
          totalSessions,
          activeSessions,
          sessionsByOS
        },
        creditStats: {
          totalCreditsIssued: totalCreditsIssued._sum.amount || 0,
          totalCreditsUsed: Math.abs(totalCreditsUsed._sum.amount || 0)
        },
        recentActivity: recentSessions
      });
    } catch (error) {
      logger.error(`Error getting system stats: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to retrieve system statistics' });
    }
  }
};
