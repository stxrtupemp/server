import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.schema';
import {
  loginHandler,
  registerHandler,
  refreshHandler,
  profileHandler,
  changePasswordHandler,
  logoutHandler,
} from './auth.controller';

const router = Router();

// ── Public ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', validateBody(loginSchema), loginHandler);

// POST /api/auth/refresh
router.post('/refresh', validateBody(refreshTokenSchema), refreshHandler);

// ── Protected ──────────────────────────────────────────────────────────────
// GET  /api/auth/me
router.get('/me', authenticate, profileHandler);

// POST /api/auth/logout
router.post('/logout', authenticate, logoutHandler);

// PUT  /api/auth/change-password
router.put('/change-password', authenticate, validateBody(changePasswordSchema), changePasswordHandler);

// POST /api/auth/register  (admin only — agents are created by admin)
router.post(
  '/register',
  authenticate,
  authorize(Role.ADMIN),
  validateBody(registerSchema),
  registerHandler,
);

export default router;
