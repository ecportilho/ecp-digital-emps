import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import type { ListTransactionsInput, TransactionSummaryInput } from './pj-transactions.schema.js';

interface TransactionRow {
  id: string;
  account_id: string;
  operator_id: string;
  type: string;
  category: string;
  amount: number;
  balance_after: number;
  direction: string;
  description: string | null;
  counterpart_name: string | null;
  counterpart_document: string | null;
  counterpart_institution: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  boleto_code: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
}

function mapTxRow(row: TransactionRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    operatorId: row.operator_id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    balanceAfter: row.balance_after,
    direction: row.direction,
    description: row.description,
    counterpartName: row.counterpart_name,
    counterpartDocument: row.counterpart_document,
    counterpartInstitution: row.counterpart_institution,
    pixKey: row.pix_key,
    pixKeyType: row.pix_key_type,
    boletoCode: row.boleto_code,
    referenceId: row.reference_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function listTransactions(companyId: string, input: ListTransactionsInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  // Get balance
  const accountFull = db.prepare(
    "SELECT balance FROM pj_accounts WHERE id = ?"
  ).get(account.id) as { balance: number };

  const conditions = ['account_id = ?'];
  const params: (string | number)[] = [account.id];

  if (input.cursor) {
    conditions.push('created_at < ?');
    params.push(input.cursor);
  }
  if (input.category) {
    conditions.push('category = ?');
    params.push(input.category);
  }
  if (input.type) {
    conditions.push('type = ?');
    params.push(input.type);
  }
  if (input.period) {
    const since = new Date(Date.now() - input.period * 24 * 60 * 60 * 1000).toISOString();
    conditions.push('created_at >= ?');
    params.push(since);
  }
  if (input.startDate) {
    conditions.push('created_at >= ?');
    params.push(input.startDate);
  }
  if (input.endDate) {
    conditions.push('created_at <= ?');
    params.push(input.endDate);
  }

  const where = conditions.join(' AND ');
  const rows = db.prepare(
    `SELECT * FROM pj_transactions WHERE ${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params, input.limit + 1) as TransactionRow[];

  const hasMore = rows.length > input.limit;
  const data = rows.slice(0, input.limit);
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].created_at : null;

  return {
    balance: accountFull.balance,
    transactions: data.map((row) => ({
      id: row.id,
      description: row.description ?? '',
      counterpart: row.counterpart_name ?? '',
      category: row.category,
      amount: row.amount,
      type: row.direction === 'in' ? 'credit' as const : 'debit' as const,
      date: row.created_at,
    })),
    nextCursor,
  };
}

export function getTransaction(companyId: string, txId: string) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  const tx = db.prepare(
    'SELECT * FROM pj_transactions WHERE id = ? AND account_id = ?'
  ).get(txId, account.id) as TransactionRow | undefined;

  if (!tx) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Transação não encontrada');
  }

  return mapTxRow(tx);
}

export function getTransactionSummary(companyId: string, input: TransactionSummaryInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  const conditions = ['account_id = ?'];
  const params: (string | number)[] = [account.id];

  if (input.startDate) {
    conditions.push('created_at >= ?');
    params.push(input.startDate);
  }
  if (input.endDate) {
    conditions.push('created_at <= ?');
    params.push(input.endDate);
  }

  const where = conditions.join(' AND ');

  const summary = db.prepare(`
    SELECT
      category,
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out,
      COUNT(*) as count
    FROM pj_transactions
    WHERE ${where}
    GROUP BY category
  `).all(...params) as { category: string; total_in: number; total_out: number; count: number }[];

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out,
      COUNT(*) as count
    FROM pj_transactions WHERE ${where}
  `).get(...params) as { total_in: number; total_out: number; count: number };

  return {
    byCategory: summary.map((s) => ({
      category: s.category,
      totalIn: s.total_in ?? 0,
      totalOut: s.total_out ?? 0,
      count: s.count,
    })),
    totalIn: totals.total_in ?? 0,
    totalOut: totals.total_out ?? 0,
    totalCount: totals.count ?? 0,
    netFlow: (totals.total_in ?? 0) - (totals.total_out ?? 0),
  };
}
