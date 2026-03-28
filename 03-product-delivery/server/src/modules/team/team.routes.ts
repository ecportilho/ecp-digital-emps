import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { inviteMemberSchema, updateRoleSchema } from './team.schema.js';
import { inviteMember, listMembers, updateMemberRole, removeMember } from './team.service.js';

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  // POST /pj/team
  app.post('/', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = inviteMemberSchema.parse(request.body);
    const result = inviteMember(request.companyId, request.userId, body);
    return reply.status(201).send(result);
  });

  // GET /pj/team
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = listMembers(request.companyId);
    return reply.status(200).send(result);
  });

  // PATCH /pj/team/:id/role
  app.patch<{ Params: { id: string } }>('/:id/role', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = updateRoleSchema.parse(request.body);
    const result = updateMemberRole(request.companyId, request.userId, request.params.id, body);
    return reply.status(200).send(result);
  });

  // DELETE /pj/team/:id
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const result = removeMember(request.companyId, request.userId, request.params.id);
    return reply.status(200).send(result);
  });
}
