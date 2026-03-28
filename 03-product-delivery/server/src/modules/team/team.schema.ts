import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(200),
  role: z.enum(['admin', 'financial', 'viewer']),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'financial', 'viewer']),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
