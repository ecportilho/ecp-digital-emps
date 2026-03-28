import { z } from 'zod';

export const switchProfileSchema = z.object({
  companyId: z.string().uuid(),
});

export type SwitchProfileInput = z.infer<typeof switchProfileSchema>;

export const authPjMeResponseSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  role: z.enum(['admin', 'financial', 'viewer']),
  company: z.object({
    id: z.string().uuid(),
    cnpj: z.string(),
    razaoSocial: z.string(),
    nomeFantasia: z.string().nullable(),
    naturezaJuridica: z.string(),
    status: z.string(),
  }),
});

export type AuthPjMeResponse = z.infer<typeof authPjMeResponseSchema>;
