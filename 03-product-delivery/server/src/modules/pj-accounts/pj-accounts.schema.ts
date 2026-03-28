import { z } from 'zod';

export const transferPfSchema = z.object({
  amount: z.number().int().positive(),
  direction: z.enum(['pf_to_pj', 'pj_to_pf']),
  description: z.string().max(200).optional(),
});

export type TransferPfInput = z.infer<typeof transferPfSchema>;
