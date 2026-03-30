import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export function getDashboard(companyId: string) {
  const db = getDatabase();

  // Company info
  const company = db.prepare(
    'SELECT nome_fantasia, cnpj FROM companies WHERE id = ?'
  ).get(companyId) as { nome_fantasia: string; cnpj: string } | undefined;

  if (!company) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Empresa nao encontrada');
  }

  // Account balance
  const account = db.prepare(
    "SELECT id, balance FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string; balance: number } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ nao encontrada');
  }

  // Cash flow - daily inflow/outflow for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const dailyCashFlow = db.prepare(`
    SELECT
      date(created_at) as date,
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as inflow,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as outflow
    FROM pj_transactions
    WHERE account_id = ? AND date(created_at) >= ?
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC
  `).all(account.id, sevenDaysAgo) as { date: string; inflow: number; outflow: number }[];

  // Fill in missing days with zeros
  const cashFlow: { date: string; inflow: number; outflow: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const found = dailyCashFlow.find((r) => r.date === dateStr);
    cashFlow.push({
      date: dateStr,
      inflow: found?.inflow ?? 0,
      outflow: found?.outflow ?? 0,
    });
  }

  // Invoice summary
  const invoiceRows = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
      SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount
    FROM invoices WHERE company_id = ?
  `).get(companyId) as Record<string, number>;

  // Recent transactions (last 5)
  const recentTx = db.prepare(`
    SELECT id, category, amount, direction, description, created_at
    FROM pj_transactions
    WHERE account_id = ?
    ORDER BY created_at DESC LIMIT 5
  `).all(account.id) as {
    id: string;
    category: string;
    amount: number;
    direction: string;
    description: string;
    created_at: string;
  }[];

  return {
    company: {
      nomeFantasia: company.nome_fantasia,
      cnpj: company.cnpj,
    },
    balance: account.balance,
    cashFlow,
    invoiceSummary: {
      pending: { count: invoiceRows.pending_count ?? 0, amount: invoiceRows.pending_amount ?? 0 },
      paid: { count: invoiceRows.paid_count ?? 0, amount: invoiceRows.paid_amount ?? 0 },
      overdue: { count: invoiceRows.overdue_count ?? 0, amount: invoiceRows.overdue_amount ?? 0 },
    },
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      description: tx.description,
      category: tx.category,
      amount: tx.amount,
      type: tx.direction === 'in' ? 'credit' as const : 'debit' as const,
      date: tx.created_at,
    })),
  };
}
