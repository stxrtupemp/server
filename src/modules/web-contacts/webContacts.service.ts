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

// ─── Create (public — no auth) ────────────────────────────────────────────────

export async function createWebContact(input: CreateWebContactInput) {
  return prisma.webContact.create({
    data:   input,
    select: webContactSelect,
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listWebContacts(input: ListWebContactsInput) {
  const { page, limit, sort, read, property_id } = input;

  const where: Prisma.WebContactWhereInput = {
    ...(read        !== undefined && { read }),
    ...(property_id               && { property_id }),
  };

  const orderBy: Prisma.WebContactOrderByWithRelationInput =
    sort === 'created_at_asc' ? { created_at: 'asc' } : { created_at: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.webContact.count({ where }),
    prisma.webContact.findMany({
      where,
      orderBy,
      ...paginate(page, limit),
      select: webContactSelect,
    }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getWebContactById(id: string) {
  const contact = await prisma.webContact.findUnique({
    where:  { id },
    select: webContactSelect,
  });
  if (!contact) throw new NotFoundError('WebContact');
  return contact;
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export async function markAsRead(id: string) {
  const existing = await prisma.webContact.findUnique({
    where:  { id },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('WebContact');

  return prisma.webContact.update({
    where:  { id },
    data:   { read: true },
    select: webContactSelect,
  });
}

// ─── Unread count (used by dashboard) ────────────────────────────────────────

export async function countUnread(): Promise<number> {
  return prisma.webContact.count({ where: { read: false } });
}
