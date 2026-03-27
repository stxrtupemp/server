import { Request, Response, NextFunction } from 'express';
import * as svc from './webContacts.service';
import { ok, created } from '../../lib/pagination';
import type { CreateWebContactInput, ListWebContactsInput } from './webContacts.schema';

// POST /api/web-contacts  — public, no auth
export async function create(
  req: Request<object, object, CreateWebContactInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contact = await svc.createWebContact(req.body);
    res.status(201).json(created(contact));
  } catch (e) { next(e); }
}

// GET /api/web-contacts  — admin | agent
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listWebContacts(
      req.query as unknown as ListWebContactsInput,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

// GET /api/web-contacts/:id
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await svc.getWebContactById(req.params['id']!);
    res.json(ok(contact));
  } catch (e) { next(e); }
}

// PATCH /api/web-contacts/:id/read
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await svc.markAsRead(req.params['id']!);
    res.json(ok(contact));
  } catch (e) { next(e); }
}
