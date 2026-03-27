import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createWebContactSchema = z.object({
  property_id: z.string().cuid().optional(),
  name:        z.string().min(2).max(200).trim(),
  email:       z.string().email().toLowerCase().trim(),
  phone:       z.string().trim().optional(),
  message:     z.string().min(5).max(2000).trim(),
});
export type CreateWebContactInput = z.infer<typeof createWebContactSchema>;

export const listWebContactsSchema = paginationSchema.extend({
  read:        z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  property_id: z.string().cuid().optional(),
  sort:        z.enum(['created_at_desc', 'created_at_asc']).optional().default('created_at_desc'),
});
export type ListWebContactsInput = z.infer<typeof listWebContactsSchema>;

export const webContactIdParamSchema = z.object({ id: z.string().cuid() });
