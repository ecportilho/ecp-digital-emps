import { z } from 'zod';

export const pixTransferSchema = z.object({
  pixKey: z.string().min(1),
  pixKeyType: z.enum(['cnpj', 'cpf', 'email', 'phone', 'random']),
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
});

export type PixTransferInput = z.infer<typeof pixTransferSchema>;

export const createPixKeySchema = z.object({
  type: z.enum(['cnpj', 'email', 'phone', 'random']),
  value: z.string().min(1).optional(),
});

export type CreatePixKeyInput = z.infer<typeof createPixKeySchema>;

export const pixQrCodeSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
  pixKeyId: z.string().uuid(),
});

export type PixQrCodeInput = z.infer<typeof pixQrCodeSchema>;

export const pixLookupSchema = z.object({
  key: z.string().min(1),
  keyType: z.enum(['cnpj', 'cpf', 'email', 'phone', 'random']),
});

export type PixLookupInput = z.infer<typeof pixLookupSchema>;
