import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import { ecpPayClient } from '../../services/ecp-pay-client.js';
import { lookupPfPixKey, creditPfAccountByKey } from '../../services/bank-integration.js';
import type { PixTransferInput, CreatePixKeyInput, PixQrCodeInput } from './pj-pix.schema.js';

interface CompanyDestination {
  type: 'pj';
  companyId: string;
  accountId: string;
  name: string;
  document: string;
}

interface PfDestination {
  type: 'pf';
  name: string;
  document: string | null;
  keyType: string;
}

type PixDestination = CompanyDestination | PfDestination;

/**
 * Resolve uma chave Pix contra o ecossistema ECP:
 *  1. Procura em `pj_pix_keys` (chaves PJ registradas em outras empresas do emps)
 *  2. Se for CNPJ, procura em `companies.cnpj` tambem
 *  3. Se nao achou PJ, consulta o ecp-digital-bank via HTTP para PF
 * Retorna null quando ninguem no ecossistema tem a chave.
 */
function resolvePixDestination(key: string): Promise<PixDestination | null> {
  const db = getDatabase();
  const cleanKey = key.trim();

  // 1) PJ key registrada em outra empresa do emps
  const pjKeyRow = db.prepare(`
    SELECT c.id AS company_id, c.nome_fantasia, c.razao_social, c.cnpj,
           a.id AS account_id
      FROM pj_pix_keys pk
      JOIN companies c ON c.id = pk.company_id AND c.deleted_at IS NULL
      JOIN pj_accounts a ON a.company_id = c.id AND a.status = 'active'
     WHERE pk.value = ? AND pk.status = 'active' AND pk.deleted_at IS NULL
     LIMIT 1
  `).get(cleanKey) as
    | { company_id: string; nome_fantasia: string | null; razao_social: string; cnpj: string; account_id: string }
    | undefined;

  if (pjKeyRow) {
    return Promise.resolve({
      type: 'pj' as const,
      companyId: pjKeyRow.company_id,
      accountId: pjKeyRow.account_id,
      name: pjKeyRow.nome_fantasia || pjKeyRow.razao_social,
      document: pjKeyRow.cnpj,
    });
  }

  // 2) CNPJ direto (mesmo sem chave Pix cadastrada)
  const cnpjDigits = cleanKey.replace(/\D/g, '');
  if (cnpjDigits.length === 14) {
    const companyRow = db.prepare(`
      SELECT c.id AS company_id, c.nome_fantasia, c.razao_social, c.cnpj,
             a.id AS account_id
        FROM companies c
        JOIN pj_accounts a ON a.company_id = c.id AND a.status = 'active'
       WHERE c.cnpj = ? AND c.deleted_at IS NULL
       LIMIT 1
    `).get(cnpjDigits) as
      | { company_id: string; nome_fantasia: string | null; razao_social: string; cnpj: string; account_id: string }
      | undefined;

    if (companyRow) {
      return Promise.resolve({
        type: 'pj' as const,
        companyId: companyRow.company_id,
        accountId: companyRow.account_id,
        name: companyRow.nome_fantasia || companyRow.razao_social,
        document: companyRow.cnpj,
      });
    }
  }

  // 3) PF via ecp-digital-bank
  return lookupPfPixKey(cleanKey).then((pfResult) => {
    if (!pfResult) return null;
    return {
      type: 'pf' as const,
      name: pfResult.holderName,
      document: null,
      keyType: pfResult.keyType,
    };
  });
}

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

export async function pixTransfer(companyId: string, userId: string, input: PixTransferInput) {
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

  // Resolve destination inside the ECP ecosystem (PJ in emps or PF in bank).
  // Resolution is best-effort — if we cannot resolve, we still debit the sender
  // (the key may be at a bank outside the ECP network). This matches the real
  // Pix semantics: the network doesn't verify the destination before sending.
  const destination = await resolvePixDestination(input.pixKey);

  const sender = db.prepare(
    'SELECT nome_fantasia, razao_social FROM companies WHERE id = ?'
  ).get(companyId) as { nome_fantasia: string | null; razao_social: string } | undefined;
  const senderName = sender?.nome_fantasia || sender?.razao_social || 'Conta PJ';

  const txId = generateId();
  const referenceId = generateId();
  const newBalance = account.balance - input.amount;

  // Phase 1: debit + local PJ credit (if applicable) atomically in a single transaction.
  db.transaction(() => {
    db.prepare("UPDATE pj_accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newBalance, account.id);

    db.prepare(`
      INSERT INTO pj_transactions (id, account_id, operator_id, type, category, amount, balance_after, direction, description, pix_key, pix_key_type, reference_id, status)
      VALUES (?, ?, ?, 'debit', 'pix_sent', ?, ?, 'out', ?, ?, ?, ?, 'completed')
    `).run(txId, account.id, userId, input.amount, newBalance, input.description || 'Pix enviado', input.pixKey, input.pixKeyType, referenceId);

    // If destination is a PJ inside this emps DB, credit atomically in the same transaction.
    if (destination && destination.type === 'pj') {
      const destAccount = db.prepare(
        'SELECT id, balance FROM pj_accounts WHERE id = ?'
      ).get(destination.accountId) as { id: string; balance: number } | undefined;
      if (destAccount) {
        const destNewBalance = destAccount.balance + input.amount;
        db.prepare("UPDATE pj_accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
          .run(destNewBalance, destAccount.id);
        db.prepare(`
          INSERT INTO pj_transactions (id, account_id, operator_id, type, category, amount, balance_after, direction, description, pix_key, pix_key_type, reference_id, status)
          VALUES (?, ?, ?, 'credit', 'pix_received', ?, ?, 'in', ?, ?, ?, ?, 'completed')
        `).run(
          generateId(), destAccount.id, 'system:pix_inbound', input.amount, destNewBalance,
          `Pix recebido de ${senderName}`, input.pixKey, input.pixKeyType, txId
        );
      }
    }

    incrementRateLimit(account.id);

    logAudit(db, {
      companyId,
      userId,
      action: 'send_pix',
      resource: 'transaction',
      resourceId: txId,
      metadata: {
        pixKey: input.pixKey,
        amount: input.amount,
        destinationType: destination?.type ?? 'external',
        destinationName: destination?.name ?? null,
      },
    });
  })();

  // Phase 2: if destination is a PF in bank, credit via HTTP. If this fails, we
  // reverse the sender debit so nobody loses money — Pix requires end-to-end
  // atomicity and the network (here: the ecosystem) is the arbiter.
  if (destination && destination.type === 'pf') {
    try {
      await creditPfAccountByKey({
        key: input.pixKey,
        amountCents: input.amount,
        description: input.description || 'Pix recebido',
        senderName,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[pixTransfer] Credit PF failed, reversing debit | tx=${txId} | reason=${reason}`);
      db.transaction(() => {
        db.prepare("UPDATE pj_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?")
          .run(input.amount, account.id);
        db.prepare("UPDATE pj_transactions SET status = 'reversed', description = description || ' — revertido: ' || ? WHERE id = ?")
          .run(reason.slice(0, 120), txId);
      })();
      throw new AppError(502, ErrorCode.INTERNAL_ERROR, `Falha ao entregar Pix: ${reason}`);
    }
  }

  return {
    transactionId: txId,
    amount: input.amount,
    balanceAfter: newBalance,
    destination: destination ? { type: destination.type, name: destination.name } : null,
  };
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

export async function lookupPixKey(key: string, keyType: string) {
  const destination = await resolvePixDestination(key);

  if (!destination) {
    // Fora do ecossistema ECP — devolve resposta generica. Em producao DICT
    // retornaria o titular real de qualquer banco participante.
    return {
      key,
      keyType,
      name: 'Destinatario externo',
      document: null,
      institution: 'Fora do ecossistema ECP',
      accountType: null,
      resolved: false as const,
    };
  }

  return {
    key,
    keyType,
    name: destination.name,
    document: destination.type === 'pj' ? destination.document : null,
    institution: destination.type === 'pj' ? 'ECP Emps (PJ)' : 'ECP Bank (PF)',
    accountType: destination.type === 'pj' ? 'pj_account' : 'checking',
    destinationType: destination.type,
    resolved: true as const,
  };
}
