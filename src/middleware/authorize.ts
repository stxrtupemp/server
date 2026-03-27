import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from './errorHandler';

/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize(Role.ADMIN), handler)
 *   router.get('/staff',      authenticate, authorize(Role.ADMIN, Role.AGENT), handler)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        ),
      );
    }

    next();
  };
}

/**
 * Ensures the authenticated user is accessing their own resource,
 * OR is an admin (admins can always access any resource).
 *
 * @param getOwnerId - function that extracts the owner id from the request
 *
 * Usage:
 *   router.put('/:id', authenticate, ownerOrAdmin((req) => req.params.id), handler)
 */
export function ownerOrAdmin(getOwnerId: (req: Request) => string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const ownerId = getOwnerId(req);

    if (req.user.role === Role.ADMIN || req.user.sub === ownerId) {
      return next();
    }

    next(new ForbiddenError('You do not have permission to access this resource'));
  };
}
