import { z } from 'zod';

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  type: z.enum(['transaction', 'invoice', 'security', 'team', 'system']).optional(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
