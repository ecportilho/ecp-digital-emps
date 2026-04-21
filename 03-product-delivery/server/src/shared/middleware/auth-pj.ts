import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { getDatabase } from '../../database/connection.js';
import { JWT_SECRET } from '../config/secrets.js';

interface JwtPayload {
  sub: string;
  companyId?: string;
  role?: string;
  profile?: string;
}

export async function authPjMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Token não fornecido');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    request.userId = payload.sub;
    request.activeProfile = (payload.profile as 'pf' | 'pj') || 'pj';

    if (payload.companyId) {
      request.companyId = payload.companyId;
      request.role = (payload.role as 'admin' | 'financial' | 'viewer') || 'viewer';
    } else {
      // Look up team membership to find company and role
      const db = getDatabase();
      const member = db.prepare(
        `SELECT company_id, role FROM team_members
         WHERE user_id = ? AND status = 'active'
         ORDER BY invited_at DESC LIMIT 1`
      ).get(payload.sub) as { company_id: string; role: string } | undefined;

      if (member) {
        request.companyId = member.company_id;
        request.role = member.role as 'admin' | 'financial' | 'viewer';
      } else {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Usuário não pertence a nenhuma empresa');
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Token inválido ou expirado');
  }
}
