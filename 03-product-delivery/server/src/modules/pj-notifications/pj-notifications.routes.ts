import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { listNotificationsSchema } from './pj-notifications.schema.js';
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from './pj-notifications.service.js';

export async function pjNotificationsRoutes(app: FastifyInstance): Promise<void> {
  // GET /pj/notifications
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const query = listNotificationsSchema.parse(request.query);
    const result = listNotifications(request.companyId, request.userId, query);
    return reply.status(200).send(result);
  });

  // GET /pj/notifications/unread-count
  app.get('/unread-count', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getUnreadCount(request.companyId, request.userId);
    return reply.status(200).send(result);
  });

  // PATCH /pj/notifications/:id/read
  app.patch<{ Params: { id: string } }>('/:id/read', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = markAsRead(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });

  // POST /pj/notifications/read-all
  app.post('/read-all', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = markAllAsRead(request.companyId, request.userId);
    return reply.status(200).send(result);
  });
}
