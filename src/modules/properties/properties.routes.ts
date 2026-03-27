import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { uploadMiddleware } from '../../config/storage';
import {
  createPropertySchema,
  updatePropertySchema,
  patchStatusSchema,
  listPropertiesSchema,
  reorderImagesSchema,
  propertyIdParamSchema,
  slugParamSchema,
  imageParamSchema,
} from './properties.schema';
import * as ctrl from './properties.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/slug/:slug',
  validateParams(slugParamSchema),
  optionalAuthenticate,
  ctrl.getBySlug,
);

// ── Protected ─────────────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/',
  validateQuery(listPropertiesSchema),
  ctrl.list,
);

router.get('/:id',
  validateParams(propertyIdParamSchema),
  ctrl.getById,
);

router.post('/',
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createPropertySchema),
  ctrl.create,
);

router.put('/:id',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: propertyIdParamSchema, body: updatePropertySchema }),
  ctrl.update,
);

router.patch('/:id/status',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: propertyIdParamSchema, body: patchStatusSchema }),
  ctrl.patchStatus,
);

router.delete('/:id',
  authorize(Role.ADMIN),
  validateParams(propertyIdParamSchema),
  ctrl.remove,
);

// ── Images ────────────────────────────────────────────────────────────────────
router.post('/:id/images',
  authorize(Role.ADMIN, Role.AGENT),
  validateParams(propertyIdParamSchema),
  uploadMiddleware.array('images', 10),
  ctrl.uploadImages,
);

router.delete('/:id/images/:imageId',
  authorize(Role.ADMIN, Role.AGENT),
  validateParams(imageParamSchema),
  ctrl.deleteImage,
);

router.patch('/:id/images/reorder',
  authorize(Role.ADMIN, Role.AGENT),
  validate({ params: propertyIdParamSchema, body: reorderImagesSchema }),
  ctrl.reorderImages,
);

export default router;
