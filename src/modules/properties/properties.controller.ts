import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as svc from './properties.service';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PatchStatusInput,
  ListPropertiesInput,
  ReorderImagesInput,
} from './properties.schema';
import { ok, created } from '../../lib/pagination';

// ─── List ─────────────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listProperties(
      req.query as unknown as ListPropertiesInput,
      req.user?.sub ?? '',
      req.user?.role ?? Role.VIEWER,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await svc.getPropertyById(req.params['id']!, req.user?.sub ?? '', req.user?.role ?? Role.VIEWER);
    res.json(ok(property));
  } catch (e) { next(e); }
}

// ─── Get by slug (public) ─────────────────────────────────────────────────────

export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await svc.getPropertyBySlug(req.params['slug']!);
    res.json(ok(property));
  } catch (e) { next(e); }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function create(req: Request<object, object, CreatePropertyInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await svc.createProperty(req.body, req.user!.sub, req.user!.role);
    res.status(201).json(created(property));
  } catch (e) { next(e); }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function update(req: Request<{ id: string }, object, UpdatePropertyInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await svc.updateProperty(req.params.id, req.body, req.user!.sub, req.user!.role);
    res.json(ok(property));
  } catch (e) { next(e); }
}

// ─── Patch status ─────────────────────────────────────────────────────────────

export async function patchStatus(req: Request<{ id: string }, object, PatchStatusInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await svc.patchPropertyStatus(req.params.id, req.body, req.user!.sub, req.user!.role);
    res.json(ok(property));
  } catch (e) { next(e); }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteProperty(req.params['id']!);
    res.status(204).send();
  } catch (e) { next(e); }
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      res.status(422).json({ success: false, error: { code: 'NO_FILES', message: 'No images provided' } });
      return;
    }
    const images = await svc.addPropertyImages(req.params['id']!, files, req.user!.sub, req.user!.role);
    res.status(201).json(created(images));
  } catch (e) { next(e); }
}

export async function deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deletePropertyImage(req.params['id']!, req.params['imageId']!, req.user!.sub, req.user!.role);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function reorderImages(req: Request<{ id: string }, object, ReorderImagesInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const images = await svc.reorderPropertyImages(req.params.id, req.body, req.user!.sub, req.user!.role);
    res.json(ok(images));
  } catch (e) { next(e); }
}
