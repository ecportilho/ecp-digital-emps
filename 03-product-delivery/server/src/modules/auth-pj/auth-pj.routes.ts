import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { switchProfileSchema } from './auth-pj.schema.js';
import { switchProfile, getMe } from './auth-pj.service.js';

export async function authPjRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/pj/switch - Switch to PJ profile
  app.post('/switch', {
    preHandler: [authPjMiddleware],
  }, async (request, reply) => {
    const body = switchProfileSchema.parse(request.body);
    const result = switchProfile(request.userId, body.companyId);
    return reply.status(200).send(result);
  });

  // GET /auth/pj/me - Get current PJ profile
  app.get('/me', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getMe(request.userId, request.companyId);
    return reply.status(200).send(result);
  });
}
