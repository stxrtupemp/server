import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { createTaskSchema, updateTaskSchema, listTasksSchema, taskIdParamSchema } from './tasks.schema';
import * as ctrl from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/',    validateQuery(listTasksSchema), ctrl.list);
router.get('/:id', validateParams(taskIdParamSchema), ctrl.getById);

router.post('/',
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createTaskSchema),
  ctrl.create,
);

router.put('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  ctrl.update,
);

router.patch('/:id/toggle',
  authorize(Role.ADMIN, Role.AGENT),
  validateParams(taskIdParamSchema),
  ctrl.toggle,
);

router.delete('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validateParams(taskIdParamSchema),
  ctrl.remove,
);

export default router;
