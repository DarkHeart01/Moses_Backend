import { PrismaClient } from '@prisma/client';
import { logger } from './logger.service';

const prisma = new PrismaClient();

export const creditService = {
  // Deduct credits from a user
  async deductCredit(userId: string, amount: number, description: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.credits < amount) {
        throw new Error('Insufficient credits');
      }
      
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: amount } }
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            amount: -amount,
            description
          }
        })
      ]);
      
      logger.info(`Deducted ${amount} credits from user ${userId} for: ${description}`);
    } catch (error) {
      logger.error(`Failed to deduct credits: ${error.message}`);
      throw new Error('Failed to deduct credits');
    }
  },
  
  // Add credits to a user
  async addCredit(userId: string, amount: number, description: string) {
    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: amount } }
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            amount,
            description
          }
        })
      ]);
      
      logger.info(`Added ${amount} credits to user ${userId} for: ${description}`);
    } catch (error) {
      logger.error(`Failed to add credits: ${error.message}`);
      throw new Error('Failed to add credits');
    }
  },
  
  // Get credit balance for a user
  async getCreditBalance(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.credits;
    } catch (error) {
      logger.error(`Failed to get credit balance: ${error.message}`);
      throw new Error('Failed to retrieve credit balance');
    }
  },
  
  // Get credit transaction history for a user
  async getCreditHistory(userId: string) {
    try {
      return await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      logger.error(`Failed to get credit history: ${error.message}`);
      throw new Error('Failed to retrieve credit history');
    }
  }
};
