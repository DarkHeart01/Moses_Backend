import { PrismaClient } from '../../prisma/client';
import { logger } from './logger.service';
import prisma from "../lib/prisma";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return getErrorMessage(error);
    return String(error);
  }

export const sessionService = {
  // Create a new session
  async createSession(userId: string, osType: string) {
    try {
      return await prisma.labSession.create({
        data: {
          userId,
          osType,
          status: 'pending',
          startTime: new Date()
        }
      });
    } catch (error) {
      logger.error(`Failed to create session: ${getErrorMessage(error)}`);
      throw new Error('Failed to create lab session');
    }
  },
  
  // Get active session for a user
  async getActiveSessionForUser(userId: string) {
    try {
      return await prisma.labSession.findFirst({
        where: {
          userId,
          status: { in: ['pending', 'provisioning', 'running'] }
        }
      });
    } catch (error) {
      logger.error(`Failed to get active session: ${getErrorMessage(error)}`);
      throw new Error('Failed to retrieve active session');
    }
  },
  
  // Get session by ID
  async getSessionById(sessionId: string, userId: string) {
    try {
      return await prisma.labSession.findFirst({
        where: {
          id: sessionId,
          userId
        }
      });
    } catch (error) {
      logger.error(`Failed to get session by ID: ${getErrorMessage(error)}`);
      throw new Error('Failed to retrieve session');
    }
  },
  
  // Update session status
  async updateSessionStatus(sessionId: string, status: string) {
    try {
      await prisma.labSession.update({
        where: { id: sessionId },
        data: { status }
      });
    } catch (error) {
      logger.error(`Failed to update session status: ${getErrorMessage(error)}`);
      throw new Error('Failed to update session status');
    }
  },
  
  // Log session activity
  async logSessionActivity(sessionId: string, action: string, details: string) {
    try {
      await prisma.sessionLog.create({
        data: {
          sessionId,
          action,
          details
        }
      });
    } catch (error) {
      logger.error(`Failed to log session activity: ${getErrorMessage(error)}`);
      // Don't throw here, just log the error
    }
  },
  
  // Calculate remaining time for a session
  calculateRemainingTime(startTime: Date): number {
    const sessionDuration = 45 * 60 * 1000; // 45 minutes in milliseconds
    const elapsedTime = Date.now() - startTime.getTime();
    const remainingTime = Math.max(0, sessionDuration - elapsedTime);
    return Math.floor(remainingTime / 1000); // Return remaining time in seconds
  },
  
  // Mark session as error
  async markSessionError(sessionId: string) {
    try {
      await this.updateSessionStatus(sessionId, 'error');
      await this.logSessionActivity(sessionId, 'error', 'Session encountered an error');
    } catch (error) {
      logger.error(`Failed to mark session as error: ${getErrorMessage(error)}`);
    }
  }
};
