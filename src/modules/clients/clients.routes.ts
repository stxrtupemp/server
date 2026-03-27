import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { createClientSchema, updateClientSchema, listClientsSchema, clientIdParamSchema } from './clients.schema';
import * as ctrl from './clients.controller';

const router = Router();
router.use(authenticate);

router.get('/',    validateQuery(listClientsSchema), ctrl.list);
router.get('/:id', validateParams(clientIdParamSchema), ctrl.getById);

router.post('/',
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createClientSchema),
  ctrl.create,
);

router.put('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: clientIdParamSchema, body: updateClientSchema }),
  ctrl.update,
);

router.delete('/:id',
  authorize(Role.ADMIN),
  validateParams(clientIdParamSchema),
  ctrl.remove,
);

export default router;
