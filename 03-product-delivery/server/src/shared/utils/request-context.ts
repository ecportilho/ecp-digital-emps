/**
 * Per-request async context. Propagates `ip` (and future fields) from the Fastify
 * request through any async stack — so service-layer code can log the caller's
 * IP in pj_audit_logs without every service signature having to carry an extra
 * parameter.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  ip: string | null;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getCurrentIp(): string | null {
  return requestContextStorage.getStore()?.ip ?? null;
}
