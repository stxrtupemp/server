import { z } from 'zod';
import { DealStatus } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';

export const createDealSchema = z.object({
  property_id:    z.string().cuid(),
  client_id:      z.string().cuid(),
  agent_id:       z.string().cuid().optional(),
  status:         z.nativeEnum(DealStatus).optional().default(DealStatus.LEAD),
  amount: z.coerce
  .number()
  .positive('El importe debe ser positivo')
  .max(999_999_999_999.99, 'Importe demasiado alto (máx. 999.999.999.999,99)')
  .optional(),

  commission_pct: z.coerce
    .number()
    .min(0, 'Mínimo 0%')
    .max(100, 'Máximo 100%')
    .optional(),
    notes:          z.string().max(3000).optional(),
    expected_close: z.coerce.date().optional(),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = createDealSchema.partial().omit({ agent_id: true });
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const patchDealStatusSchema = z.object({ status: z.nativeEnum(DealStatus) });
export type PatchDealStatusInput = z.infer<typeof patchDealStatusSchema>;

export const listDealsSchema = paginationSchema.extend({
  status:     z.nativeEnum(DealStatus).optional(),
  agent_id:   z.string().cuid().optional(),
  client_id:  z.string().cuid().optional(),
  property_id: z.string().cuid().optional(),
  sort:       z.enum(['created_at_desc', 'created_at_asc', 'expected_close_asc', 'amount_desc']).optional().default('created_at_desc'),
});
export type ListDealsInput = z.infer<typeof listDealsSchema>;

export const dealIdParamSchema = z.object({ id: z.string().cuid() });
