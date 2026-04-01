import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createTenantSchema = z.object({
  name:     z.string().min(2).max(200).trim(),
  slug:     z.string().min(2).max(100).trim().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  domain:   z.string().url().optional(),
  logo_url: z.string().url().optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const listTenantsSchema = paginationSchema.extend({
  active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().trim().optional(),
});
export type ListTenantsInput = z.infer<typeof listTenantsSchema>;

export const tenantIdParamSchema = z.object({ id: z.string() });

export const createTenantUserSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  name:     z.string().min(2).trim(),
  role:     z.enum(['ADMIN', 'AGENT', 'VIEWER']).default('ADMIN'),
  phone:    z.string().trim().optional(),
});
export type CreateTenantUserInput = z.infer<typeof createTenantUserSchema>;
