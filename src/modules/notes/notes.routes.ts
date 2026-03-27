import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate';
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesSchema,
  noteIdParamSchema,
} from './notes.schema';
import * as ctrl from './notes.controller';

const router = Router();
router.use(authenticate);

// GET /api/notes?entity_type=DEAL&entity_id=xxx
router.get('/',
  validateQuery(listNotesSchema),
  ctrl.list,
);

router.post('/',
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createNoteSchema),
  ctrl.create,
);

router.put('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: noteIdParamSchema, body: updateNoteSchema }),
  ctrl.update,
);

router.delete('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validateParams(noteIdParamSchema),
  ctrl.remove,
);

export default router;
