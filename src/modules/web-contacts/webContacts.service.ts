import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError } from '../../middleware/errorHandler';
import type { CreateWebContactInput, ListWebContactsInput } from './webContacts.schema';

const webContactSelect = {
  id:         true,
  name:       true,
  email:      true,
  phone:      true,
  message:    true,
  read:       true,
  created_at: true,
  updated_at: true,
  property: {
    select: { id: true, title: true, slug: true, city: true },
  },
} satisfies Prisma.WebContactSelect;

export async function createWebContact(input: CreateWebContactInput, tenantId: string) {
  return prisma.webContact.create({
    data:   { ...input, tenant_id: tenantId },
    select: webContactSelect,
  });
}

export async function listWebContacts(input: ListWebContactsInput, tenantId: string | null) {
  const { page, limit, sort, read, property_id } = input;

  const where: Prisma.WebContactWhereInput = {
    ...(tenantId    && { tenant_id: tenantId }),
    ...(read        !== undefined && { read }),
    ...(property_id && { property_id }),
  };

  const orderBy: Prisma.WebContactOrderByWithRelationInput =
    sort === 'created_at_asc' ? { created_at: 'asc' } : { created_at: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.webContact.count({ where }),
    prisma.webContact.findMany({ where, orderBy, ...paginate(page, limit), select: webContactSelect }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getWebContactById(id: string, tenantId: string | null) {
  const contact = await prisma.webContact.findFirst({
    where:  { id, ...(tenantId && { tenant_id: tenantId }) },
    select: webContactSelect,
  });
  if (!contact) throw new NotFoundError('WebContact');
  return contact;
}

export async function markAsRead(id: string, tenantId: string | null) {
  const existing = await prisma.webContact.findFirst({
    where:  { id, ...(tenantId && { tenant_id: tenantId }) },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('WebContact');
  return prisma.webContact.update({ where: { id }, data: { read: true }, select: webContactSelect });
}

export async function countUnread(tenantId: string | null): Promise<number> {
  return prisma.webContact.count({
    where: { read: false, ...(tenantId && { tenant_id: tenantId }) },
  });
}
