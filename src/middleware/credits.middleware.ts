import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/client';
import { logger } from '../services/logger.service';
import prisma from "../lib/prisma";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

export const creditsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user has active sessions
    const activeSession = await prisma.labSession.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['pending', 'provisioning', 'running'] }
      }
    });
    
    if (activeSession) {
      return res.status(400).json({ 
        error: 'Active session already exists',
        sessionId: activeSession.id
      });
    }
    
    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { credits: true }
    });
    
    if (!user || user.credits < 1) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }
    
    next();
  } catch (error) {
    logger.error(`Credits check error: ${getErrorMessage(error)}`);
    return res.status(500).json({ error: 'Failed to check credits' });
  }
};
