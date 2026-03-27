// notes.schema.ts
import { z } from 'zod';
import { NoteEntityType } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';

export const createNoteSchema = z.object({
  content:     z.string().min(1).max(5000).trim(),
  entity_type: z.nativeEnum(NoteEntityType),
  entity_id:   z.string().cuid(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({ content: z.string().min(1).max(5000).trim() });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const listNotesSchema = paginationSchema.extend({
  entity_type: z.nativeEnum(NoteEntityType),
  entity_id:   z.string().cuid(),
});
export type ListNotesInput = z.infer<typeof listNotesSchema>;

export const noteIdParamSchema = z.object({ id: z.string().cuid() });
