import { z } from 'zod';
import { PropertyType, OperationType, PropertyStatus } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';

// ─── Create ───────────────────────────────────────────────────────────────────

export const createPropertySchema = z.object({
  title:       z.string().min(5).max(200).trim(),
  description: z.string().max(5000).trim().optional(),
  type:        z.nativeEnum(PropertyType),
  operation:   z.nativeEnum(OperationType),
  status:      z.nativeEnum(PropertyStatus).optional().default(PropertyStatus.AVAILABLE),
  price:       z.coerce.number().positive(),
  currency:    z.string().length(3).default('EUR'),
  area_m2:     z.coerce.number().positive().optional(),
  bedrooms:    z.coerce.number().int().min(0).optional(),
  bathrooms:   z.coerce.number().int().min(0).optional(),
  parking:     z.coerce.number().int().min(0).optional(),
  address:     z.string().min(5).max(300).trim(),
  city:        z.string().min(2).max(100).trim(),
  zone:        z.string().max(100).trim().optional(),
  lat:         z.coerce.number().min(-90).max(90).optional(),
  lng:         z.coerce.number().min(-180).max(180).optional(),
  features:    z.record(z.boolean()).optional(),
  agent_id:    z.string().cuid().optional(), // admin can assign; agent uses own id
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// ─── Update (all fields optional) ────────────────────────────────────────────

export const updatePropertySchema = createPropertySchema.partial().omit({ agent_id: true });
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

// ─── Patch status ─────────────────────────────────────────────────────────────

export const patchStatusSchema = z.object({
  status: z.nativeEnum(PropertyStatus),
});
export type PatchStatusInput = z.infer<typeof patchStatusSchema>;

// ─── List / filters ───────────────────────────────────────────────────────────

export const listPropertiesSchema = paginationSchema.extend({
  type:       z.nativeEnum(PropertyType).optional(),
  operation:  z.nativeEnum(OperationType).optional(),
  status:     z.nativeEnum(PropertyStatus).optional(),
  city:       z.string().trim().optional(),
  zone:       z.string().trim().optional(),
  price_min:  z.coerce.number().positive().optional(),
  price_max:  z.coerce.number().positive().optional(),
  bedrooms:   z.coerce.number().int().min(0).optional(),
  agent_id:   z.string().cuid().optional(),
  sort:       z.enum(['price_asc', 'price_desc', 'created_at_desc', 'created_at_asc']).optional().default('created_at_desc'),
});

export type ListPropertiesInput = z.infer<typeof listPropertiesSchema>;

// ─── Image reorder ────────────────────────────────────────────────────────────

export const reorderImagesSchema = z.object({
  ids: z.array(z.string().cuid()).min(1),
});
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

// ─── Params ───────────────────────────────────────────────────────────────────

export const propertyIdParamSchema = z.object({ id: z.string().cuid() });
export const slugParamSchema        = z.object({ slug: z.string().min(1) });
export const imageParamSchema       = z.object({
  id:      z.string().cuid(),
  imageId: z.string().cuid(),
});
