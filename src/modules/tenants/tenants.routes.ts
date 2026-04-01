import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { Role } from '@prisma/client';
import * as svc from './tenants.service';
import { ok, created } from '../../lib/pagination';
import {
  createTenantSchema,
  updateTenantSchema,
  listTenantsSchema,
  tenantIdParamSchema,
  createTenantUserSchema,
} from './tenants.schema';

const router = Router();
// All tenant management endpoints require SUPER_ADMIN
// authorize() already handles SUPER_ADMIN bypass, so pass ADMIN as minimum — but since
// only SUPER_ADMIN bypasses, we use a restrictive role that non-SUPER users won't have.
// We pass Role.ADMIN but the authorize middleware will reject anyone who isn't SUPER_ADMIN
// unless they're also ADMIN. To make this strictly SUPER_ADMIN only, we check in-handler.
router.use(authenticate);

function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req.user!.role as string) !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN role required' } });
    return;
  }
  next();
}

router.use(requireSuperAdmin);

// GET /api/tenants
router.get('/', validateQuery(listTenantsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.listTenants(req.query as any);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (e) { next(e); }
});

// GET /api/tenants/:id
router.get('/:id', validateParams(tenantIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await svc.getTenantById(req.params['id']!);
    res.json(ok(tenant));
  } catch (e) { next(e); }
});

// POST /api/tenants
router.post('/', validateBody(createTenantSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await svc.createTenant(req.body);
    res.status(201).json(created(tenant));
  } catch (e) { next(e); }
});

// PATCH /api/tenants/:id
router.patch('/:id', validateParams(tenantIdParamSchema), validateBody(updateTenantSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await svc.updateTenant(req.params['id']!, req.body);
    res.json(ok(tenant));
  } catch (e) { next(e); }
});

// DELETE /api/tenants/:id
router.delete('/:id', validateParams(tenantIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteTenant(req.params['id']!);
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST /api/tenants/:id/users — create user inside a tenant
router.post('/:id/users', validateParams(tenantIdParamSchema), validateBody(createTenantUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await svc.createTenantUser(req.params['id']!, req.body);
    res.status(201).json(created(user));
  } catch (e) { next(e); }
});

// GET /api/tenants/by-slug/:slug — public lookup for client config
router.get('/by-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await svc.getTenantBySlug(req.params['slug']!);
    res.json(ok(tenant));
  } catch (e) { next(e); }
});

export default router;
