import { z } from 'zod';

export const createCardSchema = z.object({
  holderId: z.string().uuid(),
  limitCents: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(28).optional().default(25),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardLimitSchema = z.object({
  limitCents: z.number().int().positive(),
});

export type UpdateCardLimitInput = z.infer<typeof updateCardLimitSchema>;

export const blockCardSchema = z.object({
  blocked: z.boolean(),
});

export type BlockCardInput = z.infer<typeof blockCardSchema>;
