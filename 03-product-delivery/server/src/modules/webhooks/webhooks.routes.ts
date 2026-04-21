import type { FastifyInstance } from 'fastify';
import { creditAccountFromWebhook } from './webhooks.service.js';
import { ECP_PAY_WEBHOOK_SECRET } from '../../shared/config/secrets.js';

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  // POST /webhooks/payment-received
  // Called by ECP Pay when a split is settled for a restaurant
  app.post('/payment-received', async (request, reply) => {
    // Verify webhook secret
    const secret = request.headers['x-webhook-secret'] as string;

    if (secret !== ECP_PAY_WEBHOOK_SECRET) {
      return reply.status(401).send({ error: 'Invalid webhook secret' });
    }

    const body = request.body as {
      transaction_id: string;
      split_id: string;
      account_id: string;      // CNPJ of the restaurant
      account_name: string;    // Restaurant name
      amount: number;          // cents
      source_app: string;      // 'ecp-food'
      description?: string;
      reference_id?: string;
    };

    const result = creditAccountFromWebhook(body);
    return reply.status(200).send(result);
  });
}
