/**
 * HTTP client para o ecp-digital-bank.
 *
 * Usa o service account `platform@ecpay.dev` (role=system) para chamar endpoints
 * privilegiados: `/api/pix/lookup` (resolve chave PF) e `/api/pix/credit-by-key`
 * (credita conta PF quando um PJ envia Pix).
 *
 * Token cacheado por 23h (JWT expira em 24h). Se o bank estiver offline, as
 * funcoes lancam erro — quem chama decide se faz fallback ou propaga.
 */

const BANK_API_URL = process.env.ECP_BANK_API_URL || 'http://127.0.0.1:3333';
const BANK_PLATFORM_EMAIL = process.env.ECP_BANK_PLATFORM_EMAIL || 'platform@ecpay.dev';
const BANK_PLATFORM_PASSWORD = process.env.ECP_BANK_PLATFORM_PASSWORD || 'EcpPay@Platform#2026';
const TOKEN_CACHE_TTL_MS = 23 * 60 * 60 * 1000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getPlatformToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await fetch(`${BANK_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BANK_PLATFORM_EMAIL, password: BANK_PLATFORM_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Bank platform login falhou: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new Error('Bank platform login nao retornou token');
  }

  cachedToken = data.token;
  tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
  return cachedToken;
}

export interface BankPixLookupResult {
  keyType: string;
  keyValue: string;
  holderName: string;
}

/**
 * Consulta uma chave Pix no ecp-digital-bank. Retorna null se a chave nao existe
 * ou se o bank estiver indisponivel — callers tratam como "nao achado em PF".
 */
export async function lookupPfPixKey(key: string): Promise<BankPixLookupResult | null> {
  try {
    const token = await getPlatformToken();
    const url = new URL(`${BANK_API_URL}/api/pix/lookup`);
    url.searchParams.set('key', key);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return (await response.json()) as BankPixLookupResult;
  } catch (err) {
    console.warn(`[bank-integration] lookupPfPixKey falhou: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export interface BankCreditResult {
  transactionId: string;
  userId: string;
  userName: string;
  amountCents: number;
  newBalanceCents: number;
  status: 'completed';
}

/**
 * Credita uma conta PF no ecp-digital-bank. Usado quando um PJ envia Pix para
 * uma chave/CPF/email que pertence a um PF no bank.
 *
 * Lanca erro em caso de falha para que o caller (pixTransfer) possa reverter
 * o debito — nao podemos perder dinheiro.
 */
export async function creditPfAccountByKey(input: {
  key: string;
  amountCents: number;
  description: string;
  senderName: string;
}): Promise<BankCreditResult> {
  const token = await getPlatformToken();
  const response = await fetch(`${BANK_API_URL}/api/pix/credit-by-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = `Bank credit-by-key HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // keep generic message
    }
    throw new Error(message);
  }

  return (await response.json()) as BankCreditResult;
}
