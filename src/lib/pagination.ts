import { z } from 'zod';

// ─── Pagination schema (reusable) ─────────────────────────────────────────────

export const paginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Meta builder ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page:        number;
  limit:       number;
  total:       number;
  total_pages: number;
  has_next:    boolean;
  has_prev:    boolean;
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  const total_pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
}

export function paginate(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

// ─── API response helpers ─────────────────────────────────────────────────────

export function ok<T>(data: T, meta?: PaginationMeta) {
  return { success: true as const, data, ...(meta ? { meta } : {}) };
}

export function created<T>(data: T) {
  return { success: true as const, data };
}
