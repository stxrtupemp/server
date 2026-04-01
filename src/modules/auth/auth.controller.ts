import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type { LoginInput, RegisterInput, RefreshTokenInput, ChangePasswordInput } from './auth.schema';

export async function loginHandler(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, tokens } = await authService.login(req.body);
    res.status(200).json({ success: true, data: { user, tokens } });
  } catch (err) {
    next(err);
  }
}

export async function registerHandler(
  req: Request<object, object, RegisterInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requesterTenantId = req.user?.tenantId ?? null;
    const { user, tokens } = await authService.register(req.body, requesterTenantId);
    res.status(201).json({ success: true, data: { user, tokens } });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request<object, object, RefreshTokenInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tokens = await authService.refreshTokens(req.body.refresh_token);
    res.status(200).json({ success: true, data: { tokens } });
  } catch (err) {
    next(err);
  }
}

export async function profileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getProfile(req.user!.sub);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(
  req: Request<object, object, ChangePasswordInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.changePassword(req.user!.sub, req.body);
    res.status(200).json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
}
