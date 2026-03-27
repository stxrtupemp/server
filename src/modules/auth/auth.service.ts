import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../middleware/auth';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../middleware/errorHandler';
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
} from './auth.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token:  string;
  refresh_token: string;
  expires_in:    string;
  token_type:    'Bearer';
}

export interface SafeUser {
  id:         string;
  email:      string;
  name:       string;
  role:       User['role'];
  phone:      string | null;
  avatar_url: string | null;
  active:     boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, ...safe } = user;
  return safe;
}

function buildTokens(user: User): AuthTokens {
  const access_token  = signAccessToken({
    sub:   user.id,
    email: user.email,
    role:  user.role,
    name:  user.name,
  });
  const refresh_token = signRefreshToken(user.id);

  return {
    access_token,
    refresh_token,
    expires_in: env.JWT_EXPIRES_IN,
    token_type: 'Bearer',
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Constant-time: still hash to prevent timing attacks
    await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.active) {
    throw new ForbiddenError('Your account has been deactivated. Contact an administrator.');
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return { user: toSafeUser(user), tokens: buildTokens(user) };
}

export async function register(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('A user with that email already exists');
  }

  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password_hash,
      name:  input.name,
      role:  input.role,
      phone: input.phone,
    },
  });

  return { user: toSafeUser(user), tokens: buildTokens(user) };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { sub: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user) throw new UnauthorizedError('User no longer exists');
  if (!user.active) throw new ForbiddenError('Account is deactivated');

  return buildTokens(user);
}

export async function getProfile(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  return toSafeUser(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(input.current_password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const password_hash = await bcrypt.hash(input.new_password, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
}
