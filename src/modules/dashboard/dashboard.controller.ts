import { Request, Response, NextFunction } from 'express';
import { getDashboardStats } from './dashboard.service';
import { ok } from '../../lib/pagination';

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDashboardStats(req.user!.sub, req.user!.role);
    res.json(ok(data));
  } catch (e) { next(e); }
}
