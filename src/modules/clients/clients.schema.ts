import { z } from 'zod';
import { ClientType, ClientSource } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';

export const createClientSchema = z.object({
  name:     z.string().min(2).max(200).trim(),
  email:    z.string().email().toLowerCase().trim().optional(),
  phone:    z.string().trim().optional(),
  type:     z.nativeEnum(ClientType),
  source:   z.nativeEnum(ClientSource).optional().default(ClientSource.OTHER),
  notes:    z.string().max(3000).trim().optional(),
  agent_id: z.string().cuid().optional(), // admin only
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial().omit({ agent_id: true });
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const listClientsSchema = paginationSchema.extend({
  type:     z.nativeEnum(ClientType).optional(),
  source:   z.nativeEnum(ClientSource).optional(),
  agent_id: z.string().cuid().optional(),
  search:   z.string().trim().optional(), // name | email | phone
  sort:     z.enum(['name_asc', 'name_desc', 'created_at_desc', 'created_at_asc']).optional().default('created_at_desc'),
});
export type ListClientsInput = z.infer<typeof listClientsSchema>;

export const clientIdParamSchema = z.object({ id: z.string().cuid() });
