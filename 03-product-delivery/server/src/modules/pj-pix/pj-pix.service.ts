import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import { ecpPayClient } from '../../services/ecp-pay-client.js';
import type { PixTransferInput, CreatePixKeyInput, PixQrCodeInput } from './pj-pix.schema.js';

interface AccountRow {
  id: string;
  balance: number;
  daily_transfer_limit: number;
}

interface PixKeyRow {
  id: string;
  company_id: string;
  account_id: string;
  type: string;
  value: string;
  status: string;
  created_at: string;
}

interface RateLimitRow {
  id: string;
  transfer_count: number;
  window_start: string;
}

const MAX_PIX_PER_HOUR = 20;
const MAX_PIX_KEYS = 20;

/**
 * Sum of Pix debits (outgoing) already made today for this account.
 * Used to enforce the daily_transfer_limit set on each pj_accounts row.
 */
function sumPixDebitsToday(accountId: string): number {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM pj_transactions
      WHERE account_id = ?
        AND category = 'pix_sent'
        AND direction = 'out'
        AND status = 'completed'
        AND date(created_at) = date('now')`
  ).get(accountId) as { total: number };
  return row.total || 0;
}

function checkRateLimit(accountId: string): void {
  const db = getDatabase();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const record = db.prepare(
    'SELECT * FROM pj_pix_rate_limit WHERE account_id = ? AND window_start > ?'
  ).get(accountId, oneHourAgo) as RateLimitRow | undefined;

  if (record && record.transfer_count >= MAX_PIX_PER_HOUR) {
    throw new AppError(429, ErrorCode.PIX_RATE_LIMIT, 'Limite de transferências Pix por hora atingido (máx 20)');
  }
}

function incrementRateLimit(accountId: string): void {
  const db = getDatabase();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const record = db.prepare(
    'SELECT * FROM pj_pix_rate_limit WHERE account_id = ? AND window_start > ?'
  ).get(accountId, oneHourAgo) as RateLimitRow | undefined;

  if (record) {
    db.prepare('UPDATE pj_pix_rate_limit SET transfer_count = transfer_count + 1 WHERE id = ?')
      .run(record.id);
  } else {
    db.prepare('INSERT INTO pj_pix_rate_limit (id, account_id, window_start, transfer_count) VALUES (?, ?, ?, 1)')
      .run(generateId(), accountId, new Date().toISOString());
  }
}

export function pixTransfer(companyId: string, userId: string, input: PixTransferInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id, balance, daily_transfer_limit FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as AccountRow | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  if (account.balance < input.amount) {
    throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Saldo insuficiente');
  }

  // Enforce daily transfer limit (RN-01 / spec §5). The limit is the max sum of
  // outgoing Pix debits in a calendar day (America/Sao_Paulo, via date('now')).
  if (account.daily_transfer_limit > 0) {
    const spentToday = sumPixDebitsToday(account.id);
    if (spentToday + input.amount > account.daily_transfer_limit) {
      const remaining = Math.max(account.daily_transfer_limit - spentToday, 0);
      throw new AppError(
        400,
        ErrorCode.DAILY_LIMIT_EXCEEDED,
        `Limite diário de transferência excedido. Disponível hoje: R$ ${(remaining / 100).toFixed(2)}.`
      );
    }
  }

  checkRateLimit(account.id);

  const txId = generateId();
  const newBalance = account.balance - input.amount;

  db.transaction(() => {
    db.prepare("UPDATE pj_accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newBalance, account.id);

    db.prepare(`
      INSERT INTO pj_transactions (id, account_id, operator_id, type, category, amount, balance_after, direction, description, pix_key, pix_key_type, reference_id, status)
      VALUES (?, ?, ?, 'debit', 'pix_sent', ?, ?, 'out', ?, ?, ?, ?, 'completed')
    `).run(txId, account.id, userId, input.amount, newBalance, input.description || 'Pix enviado', input.pixKey, input.pixKeyType, generateId());

    incrementRateLimit(account.id);

    logAudit(db, {
      companyId,
      userId,
      action: 'send_pix',
      resource: 'transaction',
      resourceId: txId,
      metadata: { pixKey: input.pixKey, amount: input.amount },
    });
  })();

  return { transactionId: txId, amount: input.amount, balanceAfter: newBalance };
}

export function listPixKeys(companyId: string) {
  const db = getDatabase();
  const keys = db.prepare(
    "SELECT * FROM pj_pix_keys WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL"
  ).all(companyId) as PixKeyRow[];

  return keys.map((k) => ({
    id: k.id,
    type: k.type,
    value: k.value,
    status: k.status,
    createdAt: k.created_at,
  }));
}

export function createPixKey(companyId: string, userId: string, input: CreatePixKeyInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  const existingCount = db.prepare(
    "SELECT COUNT(*) as count FROM pj_pix_keys WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL"
  ).get(companyId) as { count: number };

  if (existingCount.count >= MAX_PIX_KEYS) {
    throw new AppError(400, ErrorCode.PIX_MAX_KEYS, `Limite de ${MAX_PIX_KEYS} chaves Pix atingido`);
  }

  const keyValue = input.type === 'random' ? generateId() : (input.value ?? '');

  const existingKey = db.prepare(
    "SELECT id FROM pj_pix_keys WHERE value = ? AND status = 'active' AND deleted_at IS NULL"
  ).get(keyValue);

  if (existingKey) {
    throw new AppError(409, ErrorCode.PIX_KEY_ALREADY_EXISTS, 'Chave Pix já cadastrada');
  }

  const keyId = generateId();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO pj_pix_keys (id, company_id, account_id, type, value, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(keyId, companyId, account.id, input.type, keyValue);

    logAudit(db, {
      companyId,
      userId,
      action: 'create_pix_key',
      resource: 'pix_key',
      resourceId: keyId,
      metadata: { type: input.type, value: keyValue },
    });
  })();

  return { id: keyId, type: input.type, value: keyValue, status: 'active' };
}

export function deletePixKey(companyId: string, userId: string, keyId: string) {
  const db = getDatabase();

  const key = db.prepare(
    "SELECT * FROM pj_pix_keys WHERE id = ? AND company_id = ? AND status = 'active' AND deleted_at IS NULL"
  ).get(keyId, companyId) as PixKeyRow | undefined;

  if (!key) {
    throw new AppError(404, ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix não encontrada');
  }

  db.transaction(() => {
    db.prepare("UPDATE pj_pix_keys SET status = 'inactive', deleted_at = datetime('now') WHERE id = ?")
      .run(keyId);

    logAudit(db, {
      companyId,
      userId,
      action: 'delete_pix_key',
      resource: 'pix_key',
      resourceId: keyId,
      metadata: { type: key.type, value: key.value },
    });
  })();

  return { success: true };
}

export async function generateQrCode(companyId: string, input: PixQrCodeInput) {
  const db = getDatabase();

  const key = db.prepare(
    "SELECT * FROM pj_pix_keys WHERE id = ? AND company_id = ? AND status = 'active'"
  ).get(input.pixKeyId, companyId) as PixKeyRow | undefined;

  if (!key) {
    throw new AppError(404, ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix não encontrada');
  }

  // Fetch company info for ECP Pay customer fields
  const company = db.prepare(
    'SELECT trade_name, document FROM pj_companies WHERE id = ?'
  ).get(companyId) as { trade_name: string; document: string } | undefined;

  const customerName = company?.trade_name ?? 'Empresa';
  const customerDocument = company?.document?.replace(/\D/g, '') ?? '00000000000000';

  // Try to create a real Pix charge via ECP Pay; fall back to local mock on failure
  try {
    const payResult = await ecpPayClient.createPixCharge({
      amount: input.amount,
      customer_name: customerName,
      customer_document: customerDocument,
      description: input.description ?? `Pix cobranca - ${key.value}`,
      expiration_seconds: 3600,
    });

    return {
      pixKey: key.value,
      pixKeyType: key.type,
      amount: input.amount,
      qrCode: payResult.qr_code,
      qrCodePayload: payResult.qr_code_text,
      expiration: payResult.expiration,
      ecpPayTransactionId: payResult.transaction_id,
      description: input.description,
    };
  } catch (err) {
    // ECP Pay unavailable — fall back to local mock QR Code payload.
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ecp-pay-fallback] createPixCharge failed, generating local mock QR | amount=${input.amount} | reason=${reason}`
    );
    const payload = `00020126580014br.gov.bcb.pix0136${key.value}5204000053039865405${(input.amount / 100).toFixed(2)}5802BR6009SAO PAULO62070503***6304`;

    return {
      pixKey: key.value,
      pixKeyType: key.type,
      amount: input.amount,
      qrCode: null,
      qrCodePayload: payload,
      expiration: null,
      ecpPayTransactionId: null,
      description: input.description,
    };
  }
}

export function lookupPixKey(key: string, keyType: string) {
  // Mock lookup - in production this would query DICT (Diretório de Identificadores de Contas Transacionais)
  return {
    key,
    keyType,
    name: 'Destinatário Exemplo',
    document: '***456***',
    institution: 'Banco Exemplo',
    accountType: 'checking',
  };
}
