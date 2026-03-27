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

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listClients(input: ListClientsInput, requesterId: string, requesterRole: Role) {
  const { page, limit, sort, type, source, agent_id, search } = input;

  const resolvedAgentId = requesterRole === Role.AGENT && !agent_id ? requesterId : agent_id;

  const where: Prisma.ClientWhereInput = {
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

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getClientById(id: string, requesterId: string, requesterRole: Role) {
  const client = await prisma.client.findUnique({ where: { id }, select: clientSelect });
  if (!client) throw new NotFoundError('Client');
  if (requesterRole === Role.AGENT && client.agent.id !== requesterId) {
    throw new ForbiddenError('You can only view your own clients');
  }
  return client;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createClient(input: CreateClientInput, requesterId: string, requesterRole: Role) {
  const agentId = requesterRole === Role.ADMIN && input.agent_id ? input.agent_id : requesterId;
  return prisma.client.create({
    data: { ...input, agent_id: agentId },
    select: clientSelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateClient(id: string, input: UpdateClientInput, requesterId: string, requesterRole: Role) {
  const existing = await prisma.client.findUnique({ where: { id }, select: { agent_id: true } });
  if (!existing) throw new NotFoundError('Client');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only edit your own clients');
  }
  return prisma.client.update({ where: { id }, data: input, select: clientSelect });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteClient(id: string) {
  const existing = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError('Client');
  await prisma.client.delete({ where: { id } });
}
