import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(100);
const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().optional(),
  role: z.enum(['admin', 'designer', 'sales', 'client']).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  password: passwordSchema,
});
