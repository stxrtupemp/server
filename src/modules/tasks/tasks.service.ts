import { Role, TaskPriority, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import type { CreateTaskInput, UpdateTaskInput, ListTasksInput } from './tasks.schema';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

const taskSelect = {
  id:          true,
  title:       true,
  description: true,
  due_date:    true,
  completed:   true,
  priority:    true,
  created_at:  true,
  updated_at:  true,
  deal:     { select: { id: true, status: true, property: { select: { id: true, title: true } } } },
  property: { select: { id: true, title: true, city: true } },
  client:   { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, avatar_url: true } },
  creator:  { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

export async function listTasks(
  input: ListTasksInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const { page, limit, sort, completed, priority, assigned_to, due_date_from, due_date_to, deal_id, property_id, client_id } = input;
  const resolvedAssignee = requesterRole === Role.AGENT && !assigned_to ? requesterId : assigned_to;

  const where: Prisma.TaskWhereInput = {
    ...(tenantId          && { tenant_id: tenantId }),
    ...(completed !== undefined && { completed }),
    ...(priority          && { priority }),
    ...(resolvedAssignee  && { assigned_to: resolvedAssignee }),
    ...(deal_id           && { deal_id }),
    ...(property_id       && { property_id }),
    ...(client_id         && { client_id }),
    ...(due_date_from || due_date_to ? {
      due_date: {
        ...(due_date_from && { gte: due_date_from }),
        ...(due_date_to   && { lte: due_date_to }),
      },
    } : {}),
  };

  const orderBy: Prisma.TaskOrderByWithRelationInput =
    sort === 'due_date_desc'   ? { due_date:   'desc' } :
    sort === 'created_at_desc' ? { created_at: 'desc' } :
                                 { due_date:   'asc'  };

  const [total, items] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, orderBy, ...paginate(page, limit), select: taskSelect }),
  ]);

  const sorted = sort === 'priority_desc'
    ? [...items].sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0))
    : items;

  return { items: sorted, meta: buildMeta(page, limit, total) };
}

export async function getTaskById(
  id: string,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const task = await prisma.task.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: taskSelect,
  });
  if (!task) throw new NotFoundError('Task');
  if (requesterRole === Role.AGENT && task.assignee.id !== requesterId && task.creator.id !== requesterId) {
    throw new ForbiddenError('You can only view tasks assigned to or created by you');
  }
  return task;
}

export async function createTask(
  input: CreateTaskInput,
  requesterId: string,
  tenantId: string | null,
) {
  if (!tenantId) throw new ForbiddenError('A tenant context is required to create a task');
  return prisma.task.create({
    data: { ...input, created_by: requesterId, tenant_id: tenantId },
    select: taskSelect,
  });
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const existing = await prisma.task.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { assigned_to: true, created_by: true },
  });
  if (!existing) throw new NotFoundError('Task');
  if (requesterRole === Role.AGENT && existing.assigned_to !== requesterId && existing.created_by !== requesterId) {
    throw new ForbiddenError('You can only edit tasks assigned to or created by you');
  }
  return prisma.task.update({ where: { id }, data: input, select: taskSelect });
}

export async function toggleTask(
  id: string,
  requesterId: string,
  requesterRole: Role,
  tenantId: string | null,
) {
  const existing = await prisma.task.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { completed: true, assigned_to: true, created_by: true },
  });
  if (!existing) throw new NotFoundError('Task');
  if (requesterRole === Role.AGENT && existing.assigned_to !== requesterId && existing.created_by !== requesterId) {
    throw new ForbiddenError('You can only toggle tasks assigned to or created by you');
  }
  return prisma.task.update({ where: { id }, data: { completed: !existing.completed }, select: taskSelect });
}

export async function deleteTask(id: string, tenantId: string | null) {
  const existing = await prisma.task.findFirst({
    where: { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Task');
  await prisma.task.delete({ where: { id } });
}
