import { z } from 'zod';

export const listTransactionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z.string().optional(),
  type: z.enum(['credit', 'debit']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;

export const transactionSummarySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type TransactionSummaryInput = z.infer<typeof transactionSummarySchema>;
