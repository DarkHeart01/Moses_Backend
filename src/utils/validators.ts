import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const startLabSessionSchema = z.object({
  osType: z.enum(['Ubuntu', 'Rocky Linux', 'OpenSUSE'], {
    errorMap: () => ({ message: 'Invalid OS type' })
  })
});

export const addCreditsSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional()
});
