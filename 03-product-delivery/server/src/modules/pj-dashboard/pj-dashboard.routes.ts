import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { getDashboard } from './pj-dashboard.service.js';

export async function pjDashboardRoutes(app: FastifyInstance): Promise<void> {
  // GET /pj/dashboard
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getDashboard(request.companyId);
    return reply.status(200).send(result);
  });
}
