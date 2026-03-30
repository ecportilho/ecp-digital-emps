import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './shared/middleware/error-handler.js';
import { authPjRoutes } from './modules/auth-pj/auth-pj.routes.js';
import { companiesRoutes } from './modules/companies/companies.routes.js';
import { pjAccountsRoutes } from './modules/pj-accounts/pj-accounts.routes.js';
import { pjPixRoutes } from './modules/pj-pix/pj-pix.routes.js';
import { invoicesRoutes } from './modules/invoices/invoices.routes.js';
import { pjTransactionsRoutes } from './modules/pj-transactions/pj-transactions.routes.js';
import { corporateCardsRoutes } from './modules/corporate-cards/corporate-cards.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { pjNotificationsRoutes } from './modules/pj-notifications/pj-notifications.routes.js';
import { pjDashboardRoutes } from './modules/pj-dashboard/pj-dashboard.routes.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5175',
    credentials: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  app.setErrorHandler(errorHandler);

  // Register module routes
  await app.register(authPjRoutes, { prefix: '/auth/pj' });
  await app.register(companiesRoutes, { prefix: '/companies' });
  await app.register(pjAccountsRoutes, { prefix: '/pj/accounts' });
  await app.register(pjPixRoutes, { prefix: '/pj/pix' });
  await app.register(invoicesRoutes, { prefix: '/pj/invoices' });
  await app.register(pjTransactionsRoutes, { prefix: '/pj/transactions' });
  await app.register(corporateCardsRoutes, { prefix: '/pj/cards' });
  await app.register(teamRoutes, { prefix: '/pj/team' });
  await app.register(pjNotificationsRoutes, { prefix: '/pj/notifications' });
  await app.register(pjDashboardRoutes, { prefix: '/pj/dashboard' });

  // Webhook routes (no JWT auth — uses secret header for server-to-server calls)
  await app.register(webhooksRoutes, { prefix: '/webhooks' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', service: 'ecp-emps-api' }));

  return app;
}
