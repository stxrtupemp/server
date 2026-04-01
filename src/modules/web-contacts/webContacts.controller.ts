import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import * as svc from './webContacts.service';
import { ok, created } from '../../lib/pagination';
import type { CreateWebContactInput, ListWebContactsInput } from './webContacts.schema';
import { NotFoundError } from '../../middleware/errorHandler';

// Resolve tenant_id for public requests: from property_id, or from ?tenant= slug
async function resolvePublicTenantId(propertyId?: string, tenantSlug?: string): Promise<string | null> {
  if (propertyId) {
    const prop = await prisma.property.findUnique({
      where:  { id: propertyId },
      select: { tenant_id: true },
    });
    if (prop) return prop.tenant_id;
  }
  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where:  { slug: tenantSlug },
      select: { id: true, active: true },
    });
    return tenant?.active ? tenant.id : null;
  }
  return null;
}

// POST /api/web-contacts  — public, no auth
export async function create(req: Request<object, object, CreateWebContactInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantSlug  = (req.query as Record<string, string>)['tenant'];
    const tenantId    = await resolvePublicTenantId(req.body.property_id, tenantSlug);
    if (!tenantId) {
      res.status(422).json({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Could not resolve tenant. Pass ?tenant=<slug> or include a valid property_id.' } });
      return;
    }
    const contact = await svc.createWebContact(req.body, tenantId);
    res.status(201).json(created(contact));
  } catch (e) { next(e); }
}

// GET /api/web-contacts
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listWebContacts(
      req.query as unknown as ListWebContactsInput,
      req.user!.tenantId,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

// GET /api/web-contacts/:id
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await svc.getWebContactById(req.params['id']!, req.user!.tenantId);
    res.json(ok(contact));
  } catch (e) { next(e); }
}

// PATCH /api/web-contacts/:id/read
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await svc.markAsRead(req.params['id']!, req.user!.tenantId);
    res.json(ok(contact));
  } catch (e) { next(e); }
}
