import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { createDealSchema, updateDealSchema, patchDealStatusSchema, listDealsSchema, dealIdParamSchema } from './deals.schema';
import * as ctrl from './deals.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', ctrl.stats);
router.get('/',    validateQuery(listDealsSchema), ctrl.list);
router.get('/:id', validateParams(dealIdParamSchema), ctrl.getById);

router.post('/',
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createDealSchema),
  ctrl.create,
);

router.put('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: dealIdParamSchema, body: updateDealSchema }),
  ctrl.update,
);

router.patch('/:id/status',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: dealIdParamSchema, body: patchDealStatusSchema }),
  ctrl.patchStatus,
);

router.delete('/:id',
  authorize(Role.ADMIN),
  validateParams(dealIdParamSchema),
  ctrl.remove,
);

export default router;
