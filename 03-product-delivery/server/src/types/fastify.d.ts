import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    companyId: string;
    role: 'admin' | 'financial' | 'viewer';
    activeProfile: 'pf' | 'pj';
  }
}
