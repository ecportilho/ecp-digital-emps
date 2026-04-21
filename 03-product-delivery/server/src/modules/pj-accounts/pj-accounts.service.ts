import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import type { TransferPfInput } from './pj-accounts.schema.js';

interface AccountRow {
  id: string;
  company_id: string;
  agency: string;
  number: string;
  balance: number;
  daily_transfer_limit: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getAccount(companyId: string) {
  const db = getDatabase();
  const account = db.prepare(
    "SELECT * FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as AccountRow | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  return {
    id: account.id,
    companyId: account.company_id,
    agency: account.agency,
    number: account.number,
    balance: account.balance,
    dailyTransferLimit: account.daily_transfer_limit,
    status: account.status,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

export function getBalance(companyId: string) {
  const account = getAccount(companyId);
  return { balance: account.balance };
}

export function transferPf(companyId: string, userId: string, input: TransferPfInput) {
  const db = getDatabase();
  const account = db.prepare(
    "SELECT * FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as AccountRow | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  if (input.direction === 'pj_to_pf') {
    if (account.balance < input.amount) {
      throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Saldo insuficiente');
    }
  }

  const txId = generateId();
  const isOutgoing = input.direction === 'pj_to_pf';
  const newBalance = isOutgoing
    ? account.balance - input.amount
    : account.balance + input.amount;

  db.transaction(() => {
    db.prepare('UPDATE pj_accounts SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newBalance, account.id);

    db.prepare(`
      INSERT INTO pj_transactions (id, account_id, operator_id, type, category, amount, balance_after, direction, description, counterpart_name, reference_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `).run(
      txId, account.id, userId,
      isOutgoing ? 'debit' : 'credit',
      isOutgoing ? 'transfer_pf' : 'transfer_pf',
      input.amount, newBalance,
      isOutgoing ? 'out' : 'in',
      input.description || `Transferência ${isOutgoing ? 'PJ → PF' : 'PF → PJ'}`,
      'Conta PF (mesma titularidade)',
      generateId()
    );

    logAudit(db, {
      companyId,
      userId,
      action: 'transfer_pf',
      resource: 'transaction',
      resourceId: txId,
      metadata: { direction: input.direction, amount: input.amount },
    });
  })();

  return {
    transactionId: txId,
    amount: input.amount,
    direction: input.direction,
    balanceAfter: newBalance,
  };
}
