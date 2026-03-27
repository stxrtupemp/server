import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateQuery } from '../../middleware/validate';
import { paginationSchema, buildMeta, paginate, ok } from '../../lib/pagination';

const router = Router();
router.use(authenticate);

const listUsersSchema = paginationSchema.extend({
  role:   z.nativeEnum(Role).optional(),
  active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().trim().optional(),
});

// GET /api/users
router.get('/', validateQuery(listUsersSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, role, active, search } = req.query as unknown as z.infer<typeof listUsersSchema>;

    const where = {
      ...(role   !== undefined && { role }),
      ...(active !== undefined && { active }),
      ...(search && { name: { contains: search as string, mode: 'insensitive' as const } }),
    };

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { name: 'asc' },
        select: {
          id:         true,
          email:      true,
          name:       true,
          role:       true,
          phone:      true,
          avatar_url: true,
          active:     true,
          created_at: true,
        },
      }),
    ]);

    res.json(ok(items, buildMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params['id'] },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar_url: true, active: true, created_at: true },
    });
    if (!user) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }); return; }
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/active  (admin: toggle active)
router.patch('/:id/active', authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params['id'] },
      data:  { active: req.body.active },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
});

export default router;
