import { Request, Response, NextFunction } from 'express';
import * as svc from './deals.service';
import { ok, created } from '../../lib/pagination';
import type { CreateDealInput, UpdateDealInput, PatchDealStatusInput, ListDealsInput } from './deals.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, meta } = await svc.listDeals(
      req.query as unknown as ListDealsInput,
      req.user!.sub,
      req.user!.role,
      req.user!.tenantId,
    );
    res.json(ok(items, meta));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deal = await svc.getDealById(req.params['id']!, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(deal));
  } catch (e) { next(e); }
}

export async function create(req: Request<object, object, CreateDealInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const deal = await svc.createDeal(req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.status(201).json(created(deal));
  } catch (e) { next(e); }
}

export async function update(req: Request<{ id: string }, object, UpdateDealInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const deal = await svc.updateDeal(req.params.id, req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(deal));
  } catch (e) { next(e); }
}

export async function patchStatus(req: Request<{ id: string }, object, PatchDealStatusInput>, res: Response, next: NextFunction): Promise<void> {
  try {
    const deal = await svc.patchDealStatus(req.params.id, req.body, req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(deal));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteDeal(req.params['id']!, req.user!.tenantId);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getDealStats(req.user!.sub, req.user!.role, req.user!.tenantId);
    res.json(ok(data));
  } catch (e) { next(e); }
}
