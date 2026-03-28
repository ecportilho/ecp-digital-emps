import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { listTransactionsSchema, transactionSummarySchema } from './pj-transactions.schema.js';
import { listTransactions, getTransaction, getTransactionSummary } from './pj-transactions.service.js';

export async function pjTransactionsRoutes(app: FastifyInstance): Promise<void> {
  // GET /pj/transactions
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const query = listTransactionsSchema.parse(request.query);
    const result = listTransactions(request.companyId, query);
    return reply.status(200).send(result);
  });

  // GET /pj/transactions/summary (must come before /:id)
  app.get('/summary', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const query = transactionSummarySchema.parse(request.query);
    const result = getTransactionSummary(request.companyId, query);
    return reply.status(200).send(result);
  });

  // GET /pj/transactions/:id
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getTransaction(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });
}
