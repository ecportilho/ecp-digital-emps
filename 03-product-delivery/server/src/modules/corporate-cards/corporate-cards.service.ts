import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import bcrypt from 'bcryptjs';
import type { CreateCardInput, UpdateCardLimitInput, BlockCardInput } from './corporate-cards.schema.js';

interface CardRow {
  id: string;
  company_id: string;
  account_id: string;
  holder_id: string;
  last4: string;
  card_holder: string;
  card_expiry: string;
  limit_cents: number;
  used_cents: number;
  due_day: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseRow {
  id: string;
  card_id: string;
  company_id: string;
  description: string;
  merchant_name: string;
  merchant_category: string | null;
  amount: number;
  status: string;
  purchased_at: string;
}

interface InvoiceRow {
  id: string;
  card_id: string;
  reference_month: string;
  total_cents: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function mapCardRow(row: CardRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    holderId: row.holder_id,
    last4: row.last4,
    cardHolder: row.card_holder,
    cardExpiry: row.card_expiry,
    limitCents: row.limit_cents,
    usedCents: row.used_cents,
    availableCents: row.limit_cents - row.used_cents,
    dueDay: row.due_day,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCard(companyId: string, userId: string, input: CreateCardInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  const holder = db.prepare(
    "SELECT id, name FROM team_members WHERE id = ? AND company_id = ? AND status = 'active'"
  ).get(input.holderId, companyId) as { id: string; name: string } | undefined;

  if (!holder) {
    throw new AppError(404, ErrorCode.MEMBER_NOT_FOUND, 'Membro não encontrado');
  }

  const cardId = generateId();
  const rawNumber = `5${String(Math.floor(Math.random() * 1e15)).padStart(15, '0')}`;
  const last4 = rawNumber.slice(-4);
  const hashedNumber = bcrypt.hashSync(rawNumber, 10);

  const now = new Date();
  const expiry = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear() + 4}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO corporate_cards (id, company_id, account_id, holder_id, card_number, last4, card_holder, card_expiry, limit_cents, used_cents, due_day, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')
    `).run(cardId, companyId, account.id, input.holderId, hashedNumber, last4, holder.name.toUpperCase(), expiry, input.limitCents, input.dueDay);

    logAudit(db, {
      companyId,
      userId,
      action: 'create_card',
      resource: 'card',
      resourceId: cardId,
      metadata: { holderId: input.holderId, limit: input.limitCents },
    });
  })();

  const card = db.prepare('SELECT * FROM corporate_cards WHERE id = ?').get(cardId) as CardRow;
  return mapCardRow(card);
}

export function listCards(companyId: string) {
  const db = getDatabase();
  const cards = db.prepare(
    "SELECT * FROM corporate_cards WHERE company_id = ? AND status != 'cancelled' ORDER BY created_at DESC"
  ).all(companyId) as CardRow[];
  return cards.map(mapCardRow);
}

export function getCard(companyId: string, cardId: string) {
  const db = getDatabase();
  const card = db.prepare(
    'SELECT * FROM corporate_cards WHERE id = ? AND company_id = ?'
  ).get(cardId, companyId) as CardRow | undefined;

  if (!card) {
    throw new AppError(404, ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado');
  }

  return mapCardRow(card);
}

export function updateCardLimit(companyId: string, userId: string, cardId: string, input: UpdateCardLimitInput) {
  const db = getDatabase();
  const card = db.prepare(
    'SELECT * FROM corporate_cards WHERE id = ? AND company_id = ?'
  ).get(cardId, companyId) as CardRow | undefined;

  if (!card) {
    throw new AppError(404, ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado');
  }

  db.transaction(() => {
    db.prepare("UPDATE corporate_cards SET limit_cents = ?, updated_at = datetime('now') WHERE id = ?")
      .run(input.limitCents, cardId);

    logAudit(db, {
      companyId,
      userId,
      action: 'update_card_limit',
      resource: 'card',
      resourceId: cardId,
      metadata: { oldLimit: card.limit_cents, newLimit: input.limitCents },
    });
  })();

  return getCard(companyId, cardId);
}

export function blockCard(companyId: string, userId: string, cardId: string, input: BlockCardInput) {
  const db = getDatabase();
  const card = db.prepare(
    'SELECT * FROM corporate_cards WHERE id = ? AND company_id = ?'
  ).get(cardId, companyId) as CardRow | undefined;

  if (!card) {
    throw new AppError(404, ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado');
  }

  const newStatus = input.blocked ? 'blocked' : 'active';

  db.transaction(() => {
    db.prepare("UPDATE corporate_cards SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newStatus, cardId);

    logAudit(db, {
      companyId,
      userId,
      action: input.blocked ? 'block_card' : 'unblock_card',
      resource: 'card',
      resourceId: cardId,
      metadata: { previousStatus: card.status },
    });
  })();

  return { id: cardId, status: newStatus };
}

export function getCardInvoice(companyId: string, cardId: string) {
  const db = getDatabase();

  const card = db.prepare(
    'SELECT * FROM corporate_cards WHERE id = ? AND company_id = ?'
  ).get(cardId, companyId) as CardRow | undefined;

  if (!card) {
    throw new AppError(404, ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado');
  }

  const invoice = db.prepare(
    "SELECT * FROM corporate_invoices WHERE card_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(cardId) as InvoiceRow | undefined;

  if (!invoice) {
    return { cardId, invoice: null };
  }

  return {
    cardId,
    invoice: {
      id: invoice.id,
      referenceMonth: invoice.reference_month,
      totalCents: invoice.total_cents,
      dueDate: invoice.due_date,
      status: invoice.status,
      paidAt: invoice.paid_at,
    },
  };
}

export function getCardPurchases(companyId: string, cardId: string) {
  const db = getDatabase();

  const card = db.prepare(
    'SELECT * FROM corporate_cards WHERE id = ? AND company_id = ?'
  ).get(cardId, companyId) as CardRow | undefined;

  if (!card) {
    throw new AppError(404, ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado');
  }

  const purchases = db.prepare(
    'SELECT * FROM corporate_card_purchases WHERE card_id = ? ORDER BY purchased_at DESC'
  ).all(cardId) as PurchaseRow[];

  return purchases.map((p) => ({
    id: p.id,
    description: p.description,
    merchantName: p.merchant_name,
    merchantCategory: p.merchant_category,
    amount: p.amount,
    status: p.status,
    purchasedAt: p.purchased_at,
  }));
}
