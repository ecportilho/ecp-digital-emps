import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { validateCnpj } from '../../shared/utils/cnpj.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import type { CreateCompanyInput, UpdateCompanyInput } from './companies.schema.js';

interface CompanyRow {
  id: string;
  owner_user_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  natureza_juridica: string;
  endereco: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function createCompany(userId: string, input: CreateCompanyInput) {
  const db = getDatabase();
  const strippedCnpj = input.cnpj.replace(/\D/g, '');

  if (!validateCnpj(strippedCnpj)) {
    throw new AppError(400, ErrorCode.CNPJ_INVALID, 'CNPJ inválido');
  }

  const existing = db.prepare('SELECT id FROM companies WHERE cnpj = ? AND deleted_at IS NULL').get(strippedCnpj);
  if (existing) {
    throw new AppError(409, ErrorCode.CNPJ_ALREADY_EXISTS, 'CNPJ já cadastrado');
  }

  const companyId = generateId();
  const accountId = generateId();
  const memberId = generateId();
  const accountNumber = `${Math.floor(10000000 + Math.random() * 90000000)}-${Math.floor(Math.random() * 10)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO companies (id, owner_user_id, cnpj, razao_social, nome_fantasia, natureza_juridica, endereco, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      companyId, userId, strippedCnpj, input.razaoSocial,
      input.nomeFantasia ?? null, input.naturezaJuridica,
      input.endereco ? JSON.stringify(input.endereco) : null
    );

    db.prepare(`
      INSERT INTO pj_accounts (id, company_id, agency, number, balance, status)
      VALUES (?, ?, '0001', ?, 0, 'active')
    `).run(accountId, companyId, accountNumber);

    db.prepare(`
      INSERT INTO team_members (id, company_id, user_id, role, name, email, status, accepted_at)
      VALUES (?, ?, ?, 'admin', ?, ?, 'active', datetime('now'))
    `).run(memberId, companyId, userId, input.razaoSocial, `admin@empresa.com`);

    logAudit(db, {
      companyId,
      userId,
      action: 'create_company',
      resource: 'company',
      resourceId: companyId,
      metadata: { cnpj: strippedCnpj },
    });
  })();

  return { id: companyId, accountId, status: 'active' };
}

export function getCompany(companyId: string) {
  const db = getDatabase();
  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL').get(companyId) as CompanyRow | undefined;

  if (!company) {
    throw new AppError(404, ErrorCode.COMPANY_NOT_FOUND, 'Empresa não encontrada');
  }

  return {
    id: company.id,
    ownerUserId: company.owner_user_id,
    cnpj: company.cnpj,
    razaoSocial: company.razao_social,
    nomeFantasia: company.nome_fantasia,
    naturezaJuridica: company.natureza_juridica,
    endereco: company.endereco ? JSON.parse(company.endereco) : null,
    status: company.status,
    createdAt: company.created_at,
    updatedAt: company.updated_at,
  };
}

export function updateCompany(companyId: string, userId: string, input: UpdateCompanyInput) {
  const db = getDatabase();

  const company = db.prepare('SELECT id FROM companies WHERE id = ? AND deleted_at IS NULL').get(companyId) as CompanyRow | undefined;
  if (!company) {
    throw new AppError(404, ErrorCode.COMPANY_NOT_FOUND, 'Empresa não encontrada');
  }

  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (input.nomeFantasia !== undefined) {
    sets.push('nome_fantasia = ?');
    values.push(input.nomeFantasia);
  }
  if (input.endereco !== undefined) {
    sets.push('endereco = ?');
    values.push(JSON.stringify(input.endereco));
  }

  if (sets.length === 0) {
    return getCompany(companyId);
  }

  sets.push("updated_at = datetime('now')");
  values.push(companyId);

  db.transaction(() => {
    db.prepare(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    logAudit(db, {
      companyId,
      userId,
      action: 'update_company',
      resource: 'company',
      resourceId: companyId,
      metadata: input,
    });
  })();

  return getCompany(companyId);
}
