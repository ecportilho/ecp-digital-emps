import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { createCompanySchema, updateCompanySchema } from './companies.schema.js';
import { createCompany, getCompany, updateCompany } from './companies.service.js';

export async function companiesRoutes(app: FastifyInstance): Promise<void> {
  // POST /companies - Create company
  app.post('/', {
    preHandler: [authPjMiddleware],
  }, async (request, reply) => {
    const body = createCompanySchema.parse(request.body);
    const result = createCompany(request.userId, body);
    return reply.status(201).send(result);
  });

  // GET /companies/me - Get my company
  app.get('/me', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getCompany(request.companyId);
    return reply.status(200).send(result);
  });

  // PATCH /companies/me - Update my company
  app.patch('/me', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = updateCompanySchema.parse(request.body);
    const result = updateCompany(request.companyId, request.userId, body);
    return reply.status(200).send(result);
  });
}
