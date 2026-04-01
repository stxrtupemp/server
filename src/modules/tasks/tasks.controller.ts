import { Request, Response, NextFunction } from 'express';
import * as svc from './tasks.service';
import { ok, created } from '../../lib/pagination';
import type { CreateTaskInput, UpdateTaskInput, ListTasksInput } from './tasks.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listTasks(
      req.query as unknown as ListTasksInput,
      req.user!.sub,
      req.user!.role,
      req.user!.tenantId,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await svc.getTaskById(req.params['id']!, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(task));
  } catch (e) { next(e); }
}

export async function create(req: Request<object, object, CreateTaskInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await svc.createTask(req.body, req.user!.sub, req.user!.tenantId);
    res.status(201).json(created(task));
  } catch (e) { next(e); }
}

export async function update(req: Request<{ id: string }, object, UpdateTaskInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await svc.updateTask(req.params.id, req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(task));
  } catch (e) { next(e); }
}

export async function toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await svc.toggleTask(req.params['id']!, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(task));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteTask(req.params['id']!, req.user!.tenantId);
    res.status(204).send();
  } catch (e) { next(e); }
}
