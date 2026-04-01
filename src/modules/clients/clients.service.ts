import { Role, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.schema';

const clientSelect = {
  id:         true,
  name:       true,
  email:      true,
  phone:      true,
  type:       true,
  source:     true,
  notes:      true,
  created_at: true,
  updated_at: true,
  agent: { select: { id: true, name: true, email: true } },
  _count: { select: { deals: true } },
} satisfies Prisma.ClientSelect;

export async function listClients(
  input: ListClientsInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const { page, limit, sort, type, source, agent_id, search } = input;
  const resolvedAgentId = requesterRole === Role.AGENT && !agent_id ? requesterId : agent_id;

  const where: Prisma.ClientWhereInput = {
    ...(tenantId          && { tenant_id: tenantId }),
    ...(type              && { type }),
    ...(source            && { source }),
    ...(resolvedAgentId   && { agent_id: resolvedAgentId }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const orderBy: Prisma.ClientOrderByWithRelationInput =
    sort === 'name_asc'        ? { name: 'asc' }        :
    sort === 'name_desc'       ? { name: 'desc' }       :
    sort === 'created_at_asc'  ? { created_at: 'asc' }  :
                                 { created_at: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({ where, orderBy, ...paginate(page, limit), select: clientSelect }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getClientById(
  id: string,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const client = await prisma.client.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: clientSelect,
  });
  if (!client) throw new NotFoundError('Client');
  if (requesterRole === Role.AGENT && client.agent.id !== requesterId) {
    throw new ForbiddenError('You can only view your own clients');
  }
  return client;
}

export async function createClient(
  input: CreateClientInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  if (!tenantId) throw new ForbiddenError('A tenant context is required to create a client');
  const agentId = requesterRole === Role.ADMIN && input.agent_id ? input.agent_id : requesterId;
  return prisma.client.create({
    data: { ...input, agent_id: agentId, tenant_id: tenantId },
    select: clientSelect,
  });
}

export async function updateClient(
  id: string,
  input: UpdateClientInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const existing = await prisma.client.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { agent_id: true },
  });
  if (!existing) throw new NotFoundError('Client');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only edit your own clients');
  }
  return prisma.client.update({ where: { id }, data: input, select: clientSelect });
}

export async function deleteClient(id: string, tenantId: string | null) {
  const existing = await prisma.client.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Client');
  await prisma.client.delete({ where: { id } });
}
