import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { switchProfileSchema, devLoginSchema } from './auth-pj.schema.js';
import { switchProfile, getMe, devLogin } from './auth-pj.service.js';

export async function authPjRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/pj/dev-login - Dev-only login (standalone, no PF dependency)
  app.post('/dev-login', async (request, reply) => {
    const body = devLoginSchema.parse(request.body);
    const result = devLogin(body.email, body.password);
    return reply.status(200).send(result);
  });

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
