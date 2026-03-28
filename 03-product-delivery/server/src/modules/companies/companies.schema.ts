import { z } from 'zod';

export const createCompanySchema = z.object({
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().max(200).optional(),
  naturezaJuridica: z.enum(['mei', 'ei', 'eireli', 'ltda', 'slu']),
  endereco: z.object({
    logradouro: z.string().min(2),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    bairro: z.string().min(2),
    cidade: z.string().min(2),
    uf: z.string().length(2),
    cep: z.string().min(8).max(10),
  }).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  nomeFantasia: z.string().max(200).optional(),
  endereco: z.object({
    logradouro: z.string().min(2),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    bairro: z.string().min(2),
    cidade: z.string().min(2),
    uf: z.string().length(2),
    cep: z.string().min(8).max(10),
  }).optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
