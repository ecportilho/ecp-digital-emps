import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

interface DevUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
}

interface DevCompanyRow {
  company_id: string;
  role: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
}

export function devLogin(email: string, password: string): {
  token: string;
  user: { id: string; name: string; email: string };
  company: { id: string; razaoSocial: string; nomeFantasia: string | null; cnpj: string; role: string };
} {
  const db = getDatabase();

  const user = db.prepare('SELECT * FROM pj_dev_users WHERE email = ?').get(email) as DevUserRow | undefined;
  if (!user) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Email ou senha inválidos');
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Email ou senha inválidos');
  }

  // Find user's company via team_members
  const membership = db.prepare(`
    SELECT tm.company_id, tm.role, c.razao_social, c.nome_fantasia, c.cnpj
    FROM team_members tm
    JOIN companies c ON c.id = tm.company_id
    WHERE tm.user_id = ? AND tm.status = 'active' AND c.deleted_at IS NULL
    ORDER BY tm.invited_at DESC LIMIT 1
  `).get(user.id) as DevCompanyRow | undefined;

  if (!membership) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Usuário não pertence a nenhuma empresa PJ');
  }

  const token = jwt.sign(
    {
      sub: user.id,
      companyId: membership.company_id,
      role: membership.role,
      profile: 'pj',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
    company: {
      id: membership.company_id,
      razaoSocial: membership.razao_social,
      nomeFantasia: membership.nome_fantasia,
      cnpj: membership.cnpj,
      role: membership.role,
    },
  };
}
