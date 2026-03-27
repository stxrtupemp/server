import { z } from 'zod';
import { TaskPriority } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';

export const createTaskSchema = z.object({
  title:       z.string().min(3).max(300).trim(),
  description: z.string().max(3000).trim().optional(),
  due_date:    z.coerce.date().optional(),
  priority:    z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  deal_id:     z.string().cuid().optional(),
  property_id: z.string().cuid().optional(),
  client_id:   z.string().cuid().optional(),
  assigned_to: z.string().cuid(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksSchema = paginationSchema.extend({
  completed:    z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  priority:     z.nativeEnum(TaskPriority).optional(),
  assigned_to:  z.string().cuid().optional(),
  due_date_from: z.coerce.date().optional(),
  due_date_to:   z.coerce.date().optional(),
  deal_id:      z.string().cuid().optional(),
  property_id:  z.string().cuid().optional(),
  client_id:    z.string().cuid().optional(),
  sort:         z.enum(['due_date_asc', 'due_date_desc', 'priority_desc', 'created_at_desc']).optional().default('due_date_asc'),
});
export type ListTasksInput = z.infer<typeof listTasksSchema>;

export const taskIdParamSchema = z.object({ id: z.string().cuid() });
