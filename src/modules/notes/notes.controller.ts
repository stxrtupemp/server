import { Request, Response, NextFunction } from 'express';
import * as svc from './notes.service';
import { ok, created } from '../../lib/pagination';
import type { CreateNoteInput, UpdateNoteInput, ListNotesInput } from './notes.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listNotes(req.query as unknown as ListNotesInput, req.user!.tenantId);
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

export async function create(req: Request<object, object, CreateNoteInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const note = await svc.createNote(req.body, req.user!.sub, req.user!.tenantId);
    res.status(201).json(created(note));
  } catch (e) { next(e); }
}

export async function update(req: Request<{ id: string }, object, UpdateNoteInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const note = await svc.updateNote(req.params.id, req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(note));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteNote(req.params['id']!, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.status(204).send();
  } catch (e) { next(e); }
}
