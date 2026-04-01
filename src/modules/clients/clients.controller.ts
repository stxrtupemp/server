import { Request, Response, NextFunction } from 'express';
import * as svc from './clients.service';
import { ok, created } from '../../lib/pagination';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listClients(
      req.query as unknown as ListClientsInput,
      req.user!.sub,
      req.user!.role,
      req.user!.tenantId,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await svc.getClientById(req.params['id']!, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(client));
  } catch (e) { next(e); }
}

export async function create(req: Request<object, object, CreateClientInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await svc.createClient(req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.status(201).json(created(client));
  } catch (e) { next(e); }
}

export async function update(req: Request<{ id: string }, object, UpdateClientInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await svc.updateClient(req.params.id, req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(client));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteClient(req.params['id']!, req.user!.tenantId);
    res.status(204).send();
  } catch (e) { next(e); }
}
