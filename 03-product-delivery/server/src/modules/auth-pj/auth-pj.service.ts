import jwt from 'jsonwebtoken';
import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import type { AuthPjMeResponse } from './auth-pj.schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecp-digital-bank-dev-secret-mude-em-producao';

interface CompanyRow {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  natureza_juridica: string;
  status: string;
}

interface TeamMemberRow {
  role: string;
}

export function switchProfile(userId: string, companyId: string): { token: string } {
  const db = getDatabase();

  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL').get(companyId) as CompanyRow | undefined;
  if (!company) {
    throw new AppError(404, ErrorCode.COMPANY_NOT_FOUND, 'Empresa não encontrada');
  }

  const member = db.prepare(
    "SELECT role FROM team_members WHERE user_id = ? AND company_id = ? AND status = 'active'"
  ).get(userId, companyId) as TeamMemberRow | undefined;

  if (!member) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Usuário não é membro desta empresa');
  }

  const token = jwt.sign(
    {
      sub: userId,
      companyId,
      role: member.role,
      profile: 'pj',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token };
}

export function getMe(userId: string, companyId: string): AuthPjMeResponse {
  const db = getDatabase();

  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL').get(companyId) as CompanyRow | undefined;
  if (!company) {
    throw new AppError(404, ErrorCode.COMPANY_NOT_FOUND, 'Empresa não encontrada');
  }

  const member = db.prepare(
    "SELECT role FROM team_members WHERE user_id = ? AND company_id = ? AND status = 'active'"
  ).get(userId, companyId) as TeamMemberRow | undefined;

  if (!member) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Usuário não é membro desta empresa');
  }

  return {
    userId,
    companyId,
    role: member.role as 'admin' | 'financial' | 'viewer',
    company: {
      id: company.id,
      cnpj: company.cnpj,
      razaoSocial: company.razao_social,
      nomeFantasia: company.nome_fantasia,
      naturezaJuridica: company.natureza_juridica,
      status: company.status,
    },
  };
}
