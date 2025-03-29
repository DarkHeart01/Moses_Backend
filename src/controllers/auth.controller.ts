import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../services/email.service';
import { logger } from '../services/logger.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

export const authController = {
  // User signup
  async signup(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      
      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user with default 5 credits
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          credits: 5
        }
      });
      
      // Generate verification token
      const verificationToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken);
      
      res.status(201).json({ 
        message: 'User created successfully. Please verify your email.' 
      });
    } catch (error) {
      logger.error(`Signup error: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to create user account' });
    }
  },
  
  // Email verification
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      // Update user verification status
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { emailVerified: true }
      });
      
      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      logger.error(`Verification error: ${getErrorMessage(error)}`);
      
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(400).json({ error: 'Verification link has expired' });
      }
      
      res.status(400).json({ error: 'Invalid verification token' });
    }
  },
  
  // User login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: 'Email not verified',
          needsVerification: true
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          credits: user.credits
        }
      });
    } catch (error) {
      logger.error(`Login error: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to authenticate user' });
    }
  },
  
  // Resend verification email
  async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        // Don't reveal that the user doesn't exist
        return res.status(200).json({ message: 'If your email exists in our system, a verification link has been sent' });
      }
      
      // Check if already verified
      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }
      
      // Generate new verification token
      const verificationToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken);
      
      res.status(200).json({ message: 'Verification email has been sent' });
    } catch (error) {
      logger.error(`Resend verification error: ${getErrorMessage(error)}`);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
};
