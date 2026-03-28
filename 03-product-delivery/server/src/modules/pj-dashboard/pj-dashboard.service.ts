import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export function getDashboard(companyId: string) {
  const db = getDatabase();

  // Account balance
  const account = db.prepare(
    "SELECT id, balance FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string; balance: number } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ nao encontrada');
  }

  // Transaction summary (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const txSummary = db.prepare(`
    SELECT
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out,
      COUNT(*) as tx_count
    FROM pj_transactions
    WHERE account_id = ? AND created_at >= ?
  `).get(account.id, thirtyDaysAgo) as { total_in: number; total_out: number; tx_count: number };

  // Invoice summary
  const invoiceSummary = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount
    FROM invoices WHERE company_id = ?
  `).get(companyId) as Record<string, number>;

  // Card summary
  const cardSummary = db.prepare(`
    SELECT
      COUNT(*) as total_cards,
      SUM(limit_cents) as total_limit,
      SUM(used_cents) as total_used
    FROM corporate_cards
    WHERE company_id = ? AND status = 'active'
  `).get(companyId) as { total_cards: number; total_limit: number; total_used: number };

  // Recent transactions (last 5)
  const recentTx = db.prepare(`
    SELECT id, type, category, amount, direction, description, counterpart_name, created_at
    FROM pj_transactions
    WHERE account_id = ?
    ORDER BY created_at DESC LIMIT 5
  `).all(account.id) as {
    id: string;
    type: string;
    category: string;
    amount: number;
    direction: string;
    description: string;
    counterpart_name: string;
    created_at: string;
  }[];

  // Unread notifications count
  const unread = db.prepare(
    "SELECT COUNT(*) as count FROM pj_notifications WHERE company_id = ? AND is_read = 0"
  ).get(companyId) as { count: number };

  return {
    balance: account.balance,
    cashFlow: {
      totalIn: txSummary.total_in ?? 0,
      totalOut: txSummary.total_out ?? 0,
      netFlow: (txSummary.total_in ?? 0) - (txSummary.total_out ?? 0),
      transactionCount: txSummary.tx_count ?? 0,
      period: '30d',
    },
    invoices: {
      pending: invoiceSummary.pending ?? 0,
      paid: invoiceSummary.paid ?? 0,
      overdue: invoiceSummary.overdue ?? 0,
      pendingAmount: invoiceSummary.pending_amount ?? 0,
      overdueAmount: invoiceSummary.overdue_amount ?? 0,
    },
    cards: {
      totalCards: cardSummary.total_cards ?? 0,
      totalLimit: cardSummary.total_limit ?? 0,
      totalUsed: cardSummary.total_used ?? 0,
      totalAvailable: (cardSummary.total_limit ?? 0) - (cardSummary.total_used ?? 0),
    },
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      direction: tx.direction,
      description: tx.description,
      counterpartName: tx.counterpart_name,
      createdAt: tx.created_at,
    })),
    unreadNotifications: unread.count,
  };
}
