import { Role, DealStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import type { CreateDealInput, UpdateDealInput, PatchDealStatusInput, ListDealsInput } from './deals.schema';

const dealSelect = {
  id: true,
  status: true,
  amount: true,
  commission_pct: true,
  notes: true,
  expected_close: true,
  created_at: true,
  updated_at: true,
  property: { select: { id: true, title: true, slug: true, price: true, city: true, images: { where: { is_cover: true }, take: 1, select: { url: true } } } },
  client: { select: { id: true, name: true, email: true, phone: true, type: true } },
  agent: { select: { id: true, name: true, email: true } },
} satisfies Prisma.DealSelect;

export async function listDeals(
  input: ListDealsInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const { page, limit, sort, status, agent_id, client_id, property_id } = input;
  const resolvedAgentId = requesterRole === Role.AGENT && !agent_id ? requesterId : agent_id;

  const where: Prisma.DealWhereInput = {
    ...(tenantId       && { tenant_id: tenantId }),
    ...(status         && { status }),
    ...(resolvedAgentId && { agent_id: resolvedAgentId }),
    ...(client_id      && { client_id }),
    ...(property_id    && { property_id }),
  };

  const orderBy: Prisma.DealOrderByWithRelationInput =
    sort === 'created_at_asc'      ? { created_at: 'asc' }      :
    sort === 'expected_close_asc'  ? { expected_close: 'asc' }  :
    sort === 'amount_desc'         ? { amount: 'desc' }          :
                                     { created_at: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.deal.count({ where }),
    prisma.deal.findMany({ where, orderBy, ...paginate(page, limit), select: dealSelect }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getDealById(
  id: string,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const deal = await prisma.deal.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: dealSelect,
  });
  if (!deal) throw new NotFoundError('Deal');
  if (requesterRole === Role.AGENT && deal.agent.id !== requesterId) {
    throw new ForbiddenError('You can only view your own deals');
  }
  return deal;
}

export async function createDeal(
  input: CreateDealInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  if (!tenantId) throw new ForbiddenError('A tenant context is required to create a deal');
  const agentId = requesterRole === Role.ADMIN && input.agent_id ? input.agent_id : requesterId;
  return prisma.deal.create({
    data: { ...input, agent_id: agentId, tenant_id: tenantId },
    select: dealSelect,
  });
}

export async function updateDeal(
  id: string,
  input: UpdateDealInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { agent_id: true },
  });
  if (!existing) throw new NotFoundError('Deal');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only edit your own deals');
  }
  return prisma.deal.update({ where: { id }, data: input, select: dealSelect });
}

export async function patchDealStatus(
  id: string,
  input: PatchDealStatusInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { agent_id: true },
  });
  if (!existing) throw new NotFoundError('Deal');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only update your own deals');
  }
  return prisma.deal.update({ where: { id }, data: { status: input.status }, select: dealSelect });
}

export async function deleteDeal(id: string, tenantId: string | null) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Deal');
  await prisma.deal.delete({ where: { id } });
}

export async function getDealStats(
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const baseFilter: Prisma.DealWhereInput = {
    ...(tenantId && { tenant_id: tenantId }),
    ...(requesterRole === Role.AGENT && { agent_id: requesterId }),
  };

  const statusList = Object.values(DealStatus);

  const [grouped, amountByStatus] = await prisma.$transaction([
    prisma.deal.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.deal.groupBy({
      by: ['status'],
      where: { ...baseFilter, amount: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  const countMap  = Object.fromEntries(grouped.map((r) => [r.status, (r._count as { _all: number })._all]));
  const amountMap = Object.fromEntries(amountByStatus.map((r) => [r.status, (r._sum as { amount: unknown })?.amount ?? 0]));

  return statusList.map((status) => ({
    status,
    count:  countMap[status]  ?? 0,
    amount: amountMap[status] ?? 0,
  }));
}
