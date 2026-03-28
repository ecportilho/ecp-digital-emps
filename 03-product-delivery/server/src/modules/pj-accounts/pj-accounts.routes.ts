import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { transferPfSchema } from './pj-accounts.schema.js';
import { getAccount, getBalance, transferPf } from './pj-accounts.service.js';

export async function pjAccountsRoutes(app: FastifyInstance): Promise<void> {
  // GET /pj/accounts/me
  app.get('/me', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getAccount(request.companyId);
    return reply.status(200).send(result);
  });

  // GET /pj/accounts/me/balance
  app.get('/me/balance', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getBalance(request.companyId);
    return reply.status(200).send(result);
  });

  // POST /pj/accounts/transfer-pf
  app.post('/transfer-pf', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const body = transferPfSchema.parse(request.body);
    const result = transferPf(request.companyId, request.userId, body);
    return reply.status(200).send(result);
  });
}
