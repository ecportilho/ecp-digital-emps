import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

type Role = 'admin' | 'financial' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  financial: 2,
  viewer: 1,
};

export function requireRole(minimumRole: Role) {
  return async function rbacMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const userRole = request.role;

    if (!userRole) {
      throw new AppError(403, ErrorCode.UNAUTHORIZED_ROLE, 'Perfil de acesso não definido');
    }

    const userLevel = ROLE_HIERARCHY[userRole];
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      throw new AppError(
        403,
        ErrorCode.UNAUTHORIZED_ROLE,
        `Permissão insuficiente. Requer perfil: ${minimumRole}`
      );
    }
  };
}
