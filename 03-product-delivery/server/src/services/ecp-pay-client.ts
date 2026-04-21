/**
 * ECP Pay API Client for ecp-digital-emps.
 *
 * Communicates with the ECP Pay gateway (ecp-digital-pay) to create
 * payment charges (Pix, Boleto, Card), query transactions, and issue refunds.
 *
 * Mirrors the same pattern used by ecp-digital-bank but with ecp-emps credentials.
 */

import { randomUUID } from 'node:crypto';
import { ECP_PAY_API_KEY } from '../shared/config/secrets.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ECP_PAY_URL = process.env.ECP_PAY_URL || 'http://localhost:3335';
const SOURCE_APP = 'ecp-emps';

// ---------------------------------------------------------------------------
// Types — mirror the ECP Pay API response shapes
// ---------------------------------------------------------------------------

export interface PixChargeRequest {
  amount: number;
  customer_name: string;
  customer_document: string;
  description?: string;
  expiration_seconds?: number;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PixChargeResponse {
  transaction_id: string;
  provider_id: string;
  qr_code: string;
  qr_code_text: string;
  expiration: string;
  status: string;
}

export interface BoletoChargeRequest {
  amount: number;
  customer_name: string;
  customer_document: string;
  customer_email?: string;
  due_date: string;
  description?: string;
  interest_rate?: number;
  penalty_rate?: number;
  discount_amount?: number;
  discount_days?: number;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface BoletoChargeResponse {
  transaction_id: string;
  provider_id: string;
  barcode: string;
  digitable_line: string;
  pdf_url?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  due_date: string;
  status: string;
}

export interface CardChargeRequest {
  amount: number;
  customer_name: string;
  customer_document: string;
  description?: string;
  card_token?: string;
  card_number?: string;
  card_expiry?: string;
  card_cvv?: string;
  card_holder_name?: string;
  save_card?: boolean;
  installments?: number;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CardChargeResponse {
  transaction_id: string;
  provider_id: string;
  status: string;
  card_token?: string;
  card_last4?: string;
  card_brand?: string;
}

export interface TransactionResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface RefundResponse {
  refund_id: string;
  original_transaction_id: string;
  amount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': ECP_PAY_API_KEY,
    'X-Source-App': SOURCE_APP,
  };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const key = idempotencyKey || (method !== 'GET' ? randomUUID() : undefined);
  const url = `${ECP_PAY_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: buildHeaders(key),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[ecp-pay] ${method} ${url} | app=${SOURCE_APP}${key ? ` | idempotency=${key}` : ''}`);

  const start = Date.now();
  const res = await fetch(url, options);
  const elapsed = Date.now() - start;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[ecp-pay] FALHA ${res.status} em ${elapsed}ms | ${text}`);
    throw new Error(`ECP Pay request failed: ${method} ${path} — ${res.status} ${text}`);
  }

  const result = await res.json() as T;
  const txId = (result as Record<string, unknown>).transaction_id || '-';
  console.log(`[ecp-pay] OK ${res.status} em ${elapsed}ms | transaction_id=${txId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const ecpPayClient = {
  /**
   * Create a Pix charge (QR Code + copia-e-cola).
   */
  async createPixCharge(input: PixChargeRequest): Promise<PixChargeResponse> {
    return request<PixChargeResponse>(
      'POST',
      '/pay/pix',
      input,
      randomUUID(),
    );
  },

  /**
   * Create a boleto charge with barcode + optional Pix QR.
   */
  async createBoletoCharge(input: BoletoChargeRequest): Promise<BoletoChargeResponse> {
    return request<BoletoChargeResponse>(
      'POST',
      '/pay/boleto',
      input,
      randomUUID(),
    );
  },

  /**
   * Charge a credit card.
   */
  async createCardCharge(input: CardChargeRequest): Promise<CardChargeResponse> {
    return request<CardChargeResponse>(
      'POST',
      '/pay/card',
      input,
      randomUUID(),
    );
  },

  /**
   * Get the current status / details of a transaction.
   */
  async getTransaction(transactionId: string): Promise<TransactionResponse> {
    return request<TransactionResponse>(
      'GET',
      `/pay/transactions/${transactionId}`,
    );
  },

  /**
   * Refund a transaction (full or partial).
   */
  async refund(transactionId: string, amount?: number, reason?: string): Promise<RefundResponse> {
    return request<RefundResponse>(
      'POST',
      `/pay/transactions/${transactionId}/refund`,
      { amount, reason },
      randomUUID(),
    );
  },
};
