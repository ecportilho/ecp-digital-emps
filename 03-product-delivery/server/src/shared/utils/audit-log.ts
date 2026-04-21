/**
 * Audit log helper — captures ip_address from the request-scoped async context
 * automatically, so call sites don't need to thread request.ip through.
 *
 * Always use this instead of raw `INSERT INTO pj_audit_logs` so every row gets
 * tagged with the caller's IP when available (NULL for server-to-server jobs).
 */

import type Database from 'better-sqlite3';
import { generateId } from './uuid.js';
import { getCurrentIp } from './request-context.js';

export interface AuditLogParams {
  companyId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata?: unknown;
}

export function logAudit(db: Database.Database, params: AuditLogParams): void {
  const metadataJson =
    params.metadata == null
      ? null
      : typeof params.metadata === 'string'
        ? params.metadata
        : JSON.stringify(params.metadata);

  db.prepare(`
    INSERT INTO pj_audit_logs (id, company_id, user_id, action, resource, resource_id, metadata, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId(),
    params.companyId,
    params.userId,
    params.action,
    params.resource,
    params.resourceId,
    metadataJson,
    getCurrentIp(),
  );
}
