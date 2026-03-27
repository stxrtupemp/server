import { Role, PropertyStatus, DealStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export interface DashboardStats {
  total_properties:    number;
  properties_by_status: Array<{ status: PropertyStatus; count: number }>;
  total_clients:       number;
  deals_by_status:     Array<{ status: DealStatus; count: number; total_amount: number }>;
  deals_total_amount:  number;
  tasks_pending:       number;
  tasks_overdue:       number;
  unread_contacts:     number;
  recent_deals:        RecentDeal[];
}

interface RecentDeal {
  id:             string;
  status:         DealStatus;
  amount:         number | null;
  expected_close: Date | null;
  created_at:     Date;
  property: { id: string; title: string; city: string };
  client:   { id: string; name: string };
  agent:    { id: string; name: string };
}

export async function getDashboardStats(
  requesterId: string,
  requesterRole: Role,
): Promise<DashboardStats> {
  // Agents only see their own scope
  const agentFilter: Prisma.DealWhereInput         = requesterRole === Role.AGENT ? { agent_id: requesterId } : {};
  const propAgentFilter: Prisma.PropertyWhereInput = requesterRole === Role.AGENT ? { agent_id: requesterId } : {};
  const clientFilter: Prisma.ClientWhereInput      = requesterRole === Role.AGENT ? { agent_id: requesterId } : {};
  const taskFilter: Prisma.TaskWhereInput          = requesterRole === Role.AGENT ? { assigned_to: requesterId } : {};

  const now = new Date();

  const [
    total_properties,
    propertiesByStatus,
    total_clients,
    dealsByStatus,
    tasks_pending,
    tasks_overdue,
    unread_contacts,
    recent_deals,
  ] = await prisma.$transaction([
    // 1. Total properties
    prisma.property.count({ where: propAgentFilter }),

    // 2. Properties grouped by status
    prisma.property.groupBy({
      by:    ['status'],
      where: propAgentFilter,
      _count: { _all: true },
    }),

    // 3. Total clients
    prisma.client.count({ where: clientFilter }),

    // 4. Deals grouped by status with sum
    prisma.deal.groupBy({
      by:    ['status'],
      where: agentFilter,
      _count: { _all: true },
      _sum:   { amount: true },
    }),

    // 5. Pending tasks (not completed)
    prisma.task.count({
      where: { ...taskFilter, completed: false },
    }),

    // 6. Overdue tasks (due_date < now AND not completed)
    prisma.task.count({
      where: { ...taskFilter, completed: false, due_date: { lt: now } },
    }),

    // 7. Unread web contacts
    prisma.webContact.count({ where: { read: false } }),

    // 8. Recent 5 deals
    prisma.deal.findMany({
      where:   agentFilter,
      orderBy: { created_at: 'desc' },
      take:    5,
      select: {
        id:             true,
        status:         true,
        amount:         true,
        expected_close: true,
        created_at:     true,
        property: { select: { id: true, title: true, city: true } },
        client:   { select: { id: true, name: true } },
        agent:    { select: { id: true, name: true } },
      },
    }),
  ]);

  // Build status maps
  const properties_by_status = Object.values(PropertyStatus).map((status) => ({
    status,
    count: propertiesByStatus.find((r) => r.status === status)?._count._all ?? 0,
  }));

  const deals_by_status = Object.values(DealStatus).map((status) => {
    const row = dealsByStatus.find((r) => r.status === status);
    return {
      status,
      count:        row?._count._all    ?? 0,
      total_amount: Number(row?._sum.amount ?? 0),
    };
  });

  const deals_total_amount = deals_by_status.reduce((acc, r) => acc + r.total_amount, 0);

  return {
    total_properties,
    properties_by_status,
    total_clients,
    deals_by_status,
    deals_total_amount,
    tasks_pending,
    tasks_overdue,
    unread_contacts,
    recent_deals: recent_deals.map((d) => ({
      ...d,
      amount: d.amount ? Number(d.amount) : null,
    })),
  };
}
