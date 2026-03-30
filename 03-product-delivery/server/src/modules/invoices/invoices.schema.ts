import { z } from 'zod';

export const createInvoiceSchema = z.object({
  customerName: z.string().min(2).max(200),
  customerDocument: z.string().min(11).max(18),
  customerEmail: z.string().email().optional(),
  amount: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  interestRate: z.number().int().min(0).max(1000).optional(),
  penaltyRate: z.number().int().min(0).max(1000).optional(),
  discountDays: z.number().int().min(0).optional(),
  discountAmount: z.number().int().min(0).optional(),
  type: z.enum(['single', 'installment', 'recurring']).optional(),
  installmentOf: z.number().int().positive().optional(),
  installmentTotal: z.number().int().positive().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const listInvoicesSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
