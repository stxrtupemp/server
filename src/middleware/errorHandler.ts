import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';

// ─── Custom error class ───────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code       = code;
    this.name       = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// ─── Error response shape ─────────────────────────────────────────────────────

interface ErrorResponse {
  success: false;
  error: {
    code:    string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
    stack?:  string;
  };
}

// ─── Central error handler ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const isDev = env.NODE_ENV === 'development';

  // ── Zod validation error ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Validation failed',
        issues:  err.issues.map((i) => ({
          path:    i.path.join('.'),
          message: i.message,
        })),
      },
    };
    res.status(422).json(response);
    return;
  }

  // ── Prisma known request errors ───────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint
      const field = Array.isArray(err.meta?.['target'])
        ? (err.meta?.['target'] as string[]).join(', ')
        : 'field';
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `A record with that ${field} already exists` },
      } satisfies ErrorResponse);
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      } satisfies ErrorResponse);
      return;
    }

    if (err.code === 'P2003') {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Operation violates a foreign key constraint' },
      } satisfies ErrorResponse);
      return;
    }
  }

  // ── Custom AppError hierarchy ─────────────────────────────────────────────
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(isDev && { stack: err.stack }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // ── Unknown / unhandled errors ────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  const stack   = err instanceof Error ? err.stack    : undefined;

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: isDev ? message : 'An unexpected error occurred',
      ...(isDev && { stack }),
    },
  } satisfies ErrorResponse);
}
