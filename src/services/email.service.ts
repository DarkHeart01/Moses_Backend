import nodemailer from 'nodemailer';
import { logger } from './logger.service';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const emailService = {
  // Send verification email
  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"Unnati Cloud Labs" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Unnati Cloud Labs!</h2>
          <p>Thank you for signing up. Please verify your email address to get started.</p>
          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #777; font-size: 12px;">
            Unnati Cloud Labs - Virtual Learning Environment
          </p>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send verification email: ${error.message}`);
      throw new Error('Failed to send verification email');
    }
  },
  
  // Send session expiration notification
  async sendSessionExpirationNotification(email: string, sessionId: string, osType: string, minutesRemaining: number) {
    const reconnectUrl = `${process.env.FRONTEND_URL}/lab/${sessionId}`;
    
    const mailOptions = {
      from: `"Unnati Cloud Labs" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Lab Session is Ending Soon',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Session Expiration Notice</h2>
          <p>Your ${osType} lab session will expire in <strong>${minutesRemaining} minutes</strong>.</p>
          <p>Please save your work to avoid losing any changes.</p>
          <p style="margin: 20px 0;">
            <a href="${reconnectUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reconnect to Session
            </a>
          </p>
          <p>If you need more time, you can start a new session after this one expires (requires 1 credit).</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #777; font-size: 12px;">
            Unnati Cloud Labs - Virtual Learning Environment
          </p>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Session expiration notification sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send session expiration notification: ${error.message}`);
      // Don't throw here, just log the error
    }
  }
};
