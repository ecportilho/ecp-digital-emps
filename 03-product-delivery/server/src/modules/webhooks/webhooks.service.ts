import { getDatabase } from '../../database/connection.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';

interface WebhookPayload {
  transaction_id: string;
  split_id: string;
  account_id: string;      // CNPJ
  account_name: string;
  amount: number;           // cents
  source_app: string;
  description?: string;
  reference_id?: string;
}

export function creditAccountFromWebhook(payload: WebhookPayload) {
  const db = getDatabase();

  // Check idempotency: if reference_id already exists, return existing result
  if (payload.reference_id) {
    const existing = db.prepare(
      'SELECT id FROM pj_transactions WHERE reference_id = ?'
    ).get(payload.reference_id) as { id: string } | undefined;

    if (existing) {
      return { status: 'already_processed', transaction_id: existing.id };
    }
  }

  // Find company by CNPJ
  const company = db.prepare(
    'SELECT id FROM companies WHERE cnpj = ?'
  ).get(payload.account_id) as { id: string } | undefined;

  if (!company) {
    return { status: 'error', message: `Company not found for CNPJ ${payload.account_id}` };
  }

  // Find active PJ account for this company
  const account = db.prepare(
    "SELECT id, balance FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(company.id) as { id: string; balance: number } | undefined;

  if (!account) {
    return { status: 'error', message: 'No active PJ account found' };
  }

  const txId = generateId();
  const newBalance = account.balance + payload.amount;
  const description = payload.description || `Recebido - ${payload.source_app} - ${payload.account_name}`;
  const referenceId = payload.reference_id || `split-${payload.split_id}`;

  db.transaction(() => {
    // 1. Update account balance
    db.prepare(
      "UPDATE pj_accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newBalance, account.id);

    // 2. Insert credit transaction
    db.prepare(`
      INSERT INTO pj_transactions (
        id, account_id, operator_id, type, category, amount, balance_after,
        direction, description, counterpart_name, counterpart_institution,
        reference_id, status
      ) VALUES (?, ?, 'system', 'credit', 'split_received', ?, ?, 'in', ?, ?, 'ECP Pay', ?, 'completed')
    `).run(
      txId, account.id,
      payload.amount, newBalance,
      description,
      payload.source_app,
      referenceId
    );

    // 3. Audit log
    logAudit(db, {
      companyId: company.id,
      userId: 'system',
      action: 'split_credit',
      resource: 'transaction',
      resourceId: txId,
      metadata: {
        ecp_pay_transaction_id: payload.transaction_id,
        split_id: payload.split_id,
        source_app: payload.source_app,
        amount: payload.amount,
      },
    });
  })();

  return {
    status: 'credited',
    transaction_id: txId,
    account_id: account.id,
    new_balance: newBalance,
    amount: payload.amount,
  };
}
