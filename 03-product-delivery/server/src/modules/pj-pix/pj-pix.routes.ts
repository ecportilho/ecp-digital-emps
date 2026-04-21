import type { FastifyInstance } from 'fastify';
import { authPjMiddleware } from '../../shared/middleware/auth-pj.js';
import { requireRole } from '../../shared/middleware/rbac.js';
import { pixTransferSchema, createPixKeySchema, pixQrCodeSchema, pixLookupSchema } from './pj-pix.schema.js';
import { pixTransfer, listPixKeys, createPixKey, deletePixKey, generateQrCode, lookupPixKey } from './pj-pix.service.js';

export async function pjPixRoutes(app: FastifyInstance): Promise<void> {
  // POST /pj/pix/transfer
  app.post('/transfer', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const body = pixTransferSchema.parse(request.body);
    const result = await pixTransfer(request.companyId, request.userId, body);
    return reply.status(200).send(result);
  });

  // GET /pj/pix/keys
  app.get('/keys', {
    preHandler: [authPjMiddleware, requireRole('viewer')],
  }, async (request, reply) => {
    const result = listPixKeys(request.companyId);
    return reply.status(200).send(result);
  });

  // POST /pj/pix/keys
  app.post('/keys', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const body = createPixKeySchema.parse(request.body);
    const result = createPixKey(request.companyId, request.userId, body);
    return reply.status(201).send(result);
  });

  // DELETE /pj/pix/keys/:id
  app.delete<{ Params: { id: string } }>('/keys/:id', {
    preHandler: [authPjMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const result = deletePixKey(request.companyId, request.userId, request.params.id);
    return reply.status(200).send(result);
  });

  // POST /pj/pix/qrcode
  app.post('/qrcode', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const body = pixQrCodeSchema.parse(request.body);
    const result = await generateQrCode(request.companyId, body);
    return reply.status(200).send(result);
  });

  // GET /pj/pix/lookup
  app.get('/lookup', {
    preHandler: [authPjMiddleware, requireRole('financial')],
  }, async (request, reply) => {
    const query = pixLookupSchema.parse(request.query);
    const result = await lookupPixKey(query.key, query.keyType);
    return reply.status(200).send(result);
  });
}
