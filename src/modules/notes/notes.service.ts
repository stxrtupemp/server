import { Role, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import type { CreateNoteInput, UpdateNoteInput, ListNotesInput } from './notes.schema';

const noteSelect = {
  id:          true,
  content:     true,
  entity_type: true,
  entity_id:   true,
  created_at:  true,
  updated_at:  true,
  author: { select: { id: true, name: true, avatar_url: true } },
} satisfies Prisma.NoteSelect;

export async function listNotes(input: ListNotesInput) {
  const { page, limit, entity_type, entity_id } = input;
  const where = { entity_type, entity_id };
  const [total, items] = await prisma.$transaction([
    prisma.note.count({ where }),
    prisma.note.findMany({ where, orderBy: { created_at: 'desc' }, ...paginate(page, limit), select: noteSelect }),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function createNote(input: CreateNoteInput, requesterId: string) {
  return prisma.note.create({ data: { ...input, author_id: requesterId }, select: noteSelect });
}

export async function updateNote(id: string, input: UpdateNoteInput, requesterId: string, requesterRole: Role) {
  const note = await prisma.note.findUnique({ where: { id }, select: { author_id: true } });
  if (!note) throw new NotFoundError('Note');
  if (requesterRole !== Role.ADMIN && note.author_id !== requesterId) {
    throw new ForbiddenError('You can only edit your own notes');
  }
  return prisma.note.update({ where: { id }, data: { content: input.content }, select: noteSelect });
}

export async function deleteNote(id: string, requesterId: string, requesterRole: Role) {
  const note = await prisma.note.findUnique({ where: { id }, select: { author_id: true } });
  if (!note) throw new NotFoundError('Note');
  if (requesterRole !== Role.ADMIN && note.author_id !== requesterId) {
    throw new ForbiddenError('You can only delete your own notes');
  }
  await prisma.note.delete({ where: { id } });
}
