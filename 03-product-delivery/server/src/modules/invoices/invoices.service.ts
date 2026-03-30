import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { generateBarcode, generateDigitableLine } from '../../shared/utils/boleto.js';
import { ecpPayClient } from '../../services/ecp-pay-client.js';
import type { CreateInvoiceInput, ListInvoicesInput } from './invoices.schema.js';

interface InvoiceRow {
  id: string;
  company_id: string;
  account_id: string;
  operator_id: string;
  customer_name: string;
  customer_document: string;
  customer_email: string | null;
  amount: number;
  due_date: string;
  description: string | null;
  barcode: string | null;
  digitable_line: string | null;
  pix_qrcode: string | null;
  pix_copy_paste: string | null;
  interest_rate: number;
  penalty_rate: number;
  discount_days: number;
  discount_amount: number;
  status: string;
  paid_at: string | null;
  paid_amount: number | null;
  notification_sent: number;
  type: string;
  installment_of: number | null;
  installment_total: number | null;
  parent_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapInvoiceRow(row: InvoiceRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    accountId: row.account_id,
    operatorId: row.operator_id,
    customerName: row.customer_name,
    customerDocument: row.customer_document,
    customerEmail: row.customer_email,
    amount: row.amount,
    dueDate: row.due_date,
    description: row.description,
    barcode: row.barcode,
    digitableLine: row.digitable_line,
    pixQrcode: row.pix_qrcode,
    pixCopyPaste: row.pix_copy_paste,
    interestRate: row.interest_rate,
    penaltyRate: row.penalty_rate,
    discountDays: row.discount_days,
    discountAmount: row.discount_amount,
    status: row.status,
    paidAt: row.paid_at,
    paidAmount: row.paid_amount,
    notificationSent: row.notification_sent === 1,
    type: row.type,
    installmentOf: row.installment_of,
    installmentTotal: row.installment_total,
    parentInvoiceId: row.parent_invoice_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createInvoice(companyId: string, userId: string, input: CreateInvoiceInput) {
  const db = getDatabase();

  const account = db.prepare(
    "SELECT id FROM pj_accounts WHERE company_id = ? AND status = 'active'"
  ).get(companyId) as { id: string } | undefined;

  if (!account) {
    throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, 'Conta PJ não encontrada');
  }

  const invoiceId = generateId();

  // Try to register the boleto with ECP Pay; fall back to local mock on failure
  let barcode: string;
  let digitableLine: string;
  let ecpPayTransactionId: string | null = null;
  let pixQrcode: string | null = null;
  let pixCopyPaste: string | null = null;

  try {
    const payResult = await ecpPayClient.createBoletoCharge({
      amount: input.amount,
      customer_name: input.customerName,
      customer_document: input.customerDocument.replace(/\D/g, ''),
      customer_email: input.customerEmail ?? undefined,
      due_date: input.dueDate,
      description: input.description ?? undefined,
      interest_rate: input.interestRate ?? 100,
      penalty_rate: input.penaltyRate ?? 200,
      discount_amount: input.discountAmount ?? 0,
      discount_days: input.discountDays ?? 0,
    });

    barcode = payResult.barcode;
    digitableLine = payResult.digitable_line;
    ecpPayTransactionId = payResult.transaction_id;
    pixQrcode = payResult.pix_qr_code ?? null;
    pixCopyPaste = payResult.pix_copy_paste ?? null;
  } catch {
    // ECP Pay unavailable — fall back to local mock barcode generation
    barcode = generateBarcode(input.amount, input.dueDate);
    digitableLine = generateDigitableLine(barcode);
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO invoices (id, company_id, account_id, operator_id, customer_name, customer_document, customer_email, amount, due_date, description, barcode, digitable_line, pix_qrcode, pix_copy_paste, interest_rate, penalty_rate, discount_days, discount_amount, type, installment_of, installment_total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      invoiceId, companyId, account.id, userId,
      input.customerName, input.customerDocument.replace(/\D/g, ''),
      input.customerEmail ?? null, input.amount, input.dueDate,
      input.description ?? null, barcode, digitableLine,
      pixQrcode, pixCopyPaste,
      input.interestRate ?? 100, input.penaltyRate ?? 200,
      input.discountDays ?? 0, input.discountAmount ?? 0,
      input.type ?? 'single', input.installmentOf ?? null, input.installmentTotal ?? null
    );

    // If ECP Pay returned a transaction_id, store it in metadata
    const auditMeta: Record<string, unknown> = { amount: input.amount, customer: input.customerName };
    if (ecpPayTransactionId) {
      auditMeta.ecpPayTransactionId = ecpPayTransactionId;
    }

    db.prepare(`
      INSERT INTO pj_audit_logs (id, company_id, user_id, action, resource, resource_id, metadata)
      VALUES (?, ?, ?, 'create_invoice', 'invoice', ?, ?)
    `).run(generateId(), companyId, userId, invoiceId, JSON.stringify(auditMeta));
  })();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as InvoiceRow;
  return mapInvoiceRow(invoice);
}

export function listInvoices(companyId: string, input: ListInvoicesInput) {
  const db = getDatabase();
  const conditions = ['company_id = ?'];
  const params: (string | number)[] = [companyId];

  if (input.status) {
    conditions.push('status = ?');
    params.push(input.status);
  }
  if (input.search) {
    conditions.push('customer_name LIKE ?');
    params.push(`%${input.search}%`);
  }
  if (input.startDate) {
    conditions.push('due_date >= ?');
    params.push(input.startDate);
  }
  if (input.endDate) {
    conditions.push('due_date <= ?');
    params.push(input.endDate);
  }

  const offset = (input.page - 1) * input.limit;
  const where = conditions.join(' AND ');

  const rows = db.prepare(
    `SELECT * FROM invoices WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, input.limit, offset) as InvoiceRow[];

  return rows.map((row) => ({
    id: row.id,
    clientName: row.customer_name,
    amount: row.amount,
    dueDate: row.due_date,
    status: row.status,
  }));
}

export function getInvoice(companyId: string, invoiceId: string) {
  const db = getDatabase();
  const invoice = db.prepare(
    'SELECT * FROM invoices WHERE id = ? AND company_id = ?'
  ).get(invoiceId, companyId) as InvoiceRow | undefined;

  if (!invoice) {
    throw new AppError(404, ErrorCode.INVOICE_NOT_FOUND, 'Boleto não encontrado');
  }

  return mapInvoiceRow(invoice);
}

export function cancelInvoice(companyId: string, userId: string, invoiceId: string) {
  const db = getDatabase();
  const invoice = db.prepare(
    'SELECT * FROM invoices WHERE id = ? AND company_id = ?'
  ).get(invoiceId, companyId) as InvoiceRow | undefined;

  if (!invoice) {
    throw new AppError(404, ErrorCode.INVOICE_NOT_FOUND, 'Boleto não encontrado');
  }

  if (invoice.status === 'paid') {
    throw new AppError(400, ErrorCode.INVOICE_ALREADY_PAID, 'Boleto já foi pago');
  }

  if (invoice.status === 'cancelled') {
    throw new AppError(400, ErrorCode.INVOICE_ALREADY_CANCELLED, 'Boleto já foi cancelado');
  }

  db.transaction(() => {
    db.prepare("UPDATE invoices SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
      .run(invoiceId);

    db.prepare(`
      INSERT INTO pj_audit_logs (id, company_id, user_id, action, resource, resource_id, metadata)
      VALUES (?, ?, ?, 'cancel_invoice', 'invoice', ?, ?)
    `).run(generateId(), companyId, userId, invoiceId, JSON.stringify({ previousStatus: invoice.status }));
  })();

  return { id: invoiceId, status: 'cancelled' };
}

export function resendInvoice(companyId: string, userId: string, invoiceId: string) {
  const db = getDatabase();
  const invoice = db.prepare(
    'SELECT * FROM invoices WHERE id = ? AND company_id = ?'
  ).get(invoiceId, companyId) as InvoiceRow | undefined;

  if (!invoice) {
    throw new AppError(404, ErrorCode.INVOICE_NOT_FOUND, 'Boleto não encontrado');
  }

  db.transaction(() => {
    db.prepare("UPDATE invoices SET notification_sent = 1, updated_at = datetime('now') WHERE id = ?")
      .run(invoiceId);

    db.prepare(`
      INSERT INTO pj_audit_logs (id, company_id, user_id, action, resource, resource_id, metadata)
      VALUES (?, ?, ?, 'resend_invoice', 'invoice', ?, ?)
    `).run(generateId(), companyId, userId, invoiceId, JSON.stringify({ email: invoice.customer_email }));
  })();

  return { id: invoiceId, notificationSent: true };
}

export function getInvoiceSummary(companyId: string) {
  const db = getDatabase();

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'paid' THEN paid_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount
    FROM invoices WHERE company_id = ?
  `).get(companyId) as Record<string, number>;

  return {
    total: { count: summary.total ?? 0, amount: (summary.pending_amount ?? 0) + (summary.paid_amount ?? 0) + (summary.overdue_amount ?? 0) },
    paid: { count: summary.paid ?? 0, amount: summary.paid_amount ?? 0 },
    overdue: { count: summary.overdue ?? 0, amount: summary.overdue_amount ?? 0 },
  };
}
