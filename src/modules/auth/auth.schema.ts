import { z } from 'zod';
import { Role } from '@prisma/client';

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Register (admin only) ────────────────────────────────────────────────────

export const registerSchema = z.object({
  email:    z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name:     z.string().min(2, 'Name must be at least 2 characters').trim(),
  role:     z.nativeEnum(Role).optional().default(Role.AGENT),
  phone:    z.string().trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Refresh token ────────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─── Change password ──────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path:    ['confirm_password'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
