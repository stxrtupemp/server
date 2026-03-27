import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import {
  createWebContactSchema,
  listWebContactsSchema,
  webContactIdParamSchema,
} from './webContacts.schema';
import * as ctrl from './webContacts.controller';

const router = Router();

// ── Public — contact form submission ─────────────────────────────────────────
router.post('/',
  validateBody(createWebContactSchema),
  ctrl.create,
);

// ── Protected ─────────────────────────────────────────────────────────────────
router.use(authenticate, authorize(Role.ADMIN, Role.AGENT));

router.get('/',
  validateQuery(listWebContactsSchema),
  ctrl.list,
);

router.get('/:id',
  validateParams(webContactIdParamSchema),
  ctrl.getById,
);

router.patch('/:id/read',
  validateParams(webContactIdParamSchema),
  ctrl.markRead,
);

export default router;
