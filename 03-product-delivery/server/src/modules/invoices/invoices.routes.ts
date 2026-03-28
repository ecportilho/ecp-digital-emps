import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { createInvoiceSchema, listInvoicesSchema } from './invoices.schema.js';
import { createInvoice, listInvoices, getInvoice, cancelInvoice, resendInvoice, getInvoiceSummary } from './invoices.service.js';

export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  // POST /pj/invoices
  app.post('/', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const body = createInvoiceSchema.parse(request.body);
    const result = createInvoice(request.companyId, request.userId, body);
    return reply.status(201).send(result);
  });

  // GET /pj/invoices
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const query = listInvoicesSchema.parse(request.query);
    const result = listInvoices(request.companyId, query);
    return reply.status(200).send(result);
  });

  // GET /pj/invoices/summary (must come before /:id)
  app.get('/summary', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getInvoiceSummary(request.companyId);
    return reply.status(200).send(result);
  });

  // GET /pj/invoices/:id
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getInvoice(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });

  // PATCH /pj/invoices/:id/cancel
  app.patch<{ Params: { id: string } }>('/:id/cancel', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const result = cancelInvoice(request.companyId, request.userId, request.params.id);
    return reply.status(200).send(result);
  });

  // POST /pj/invoices/:id/resend
  app.post<{ Params: { id: string } }>('/:id/resend', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const result = resendInvoice(request.companyId, request.userId, request.params.id);
    return reply.status(200).send(result);
  });
}
