import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { createCardSchema, updateCardLimitSchema, blockCardSchema } from './corporate-cards.schema.js';
import { createCard, listCards, getCard, updateCardLimit, blockCard, getCardInvoice, getCardPurchases } from './corporate-cards.service.js';

export async function corporateCardsRoutes(app: FastifyInstance): Promise<void> {
  // POST /pj/cards
  app.post('/', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = createCardSchema.parse(request.body);
    const result = createCard(request.companyId, request.userId, body);
    return reply.status(201).send(result);
  });

  // GET /pj/cards
  app.get('/', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = listCards(request.companyId);
    return reply.status(200).send(result);
  });

  // GET /pj/cards/:id
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getCard(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });

  // PATCH /pj/cards/:id/limit
  app.patch<{ Params: { id: string } }>('/:id/limit', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = updateCardLimitSchema.parse(request.body);
    const result = updateCardLimit(request.companyId, request.userId, request.params.id, body);
    return reply.status(200).send(result);
  });

  // PATCH /pj/cards/:id/block
  app.patch<{ Params: { id: string } }>('/:id/block', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = blockCardSchema.parse(request.body);
    const result = blockCard(request.companyId, request.userId, request.params.id, body);
    return reply.status(200).send(result);
  });

  // GET /pj/cards/:id/invoice
  app.get<{ Params: { id: string } }>('/:id/invoice', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getCardInvoice(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });

  // GET /pj/cards/:id/purchases
  app.get<{ Params: { id: string } }>('/:id/purchases', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = getCardPurchases(request.companyId, request.params.id);
    return reply.status(200).send(result);
  });
}
