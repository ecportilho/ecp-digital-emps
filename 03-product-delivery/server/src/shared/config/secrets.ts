/**
 * Centralized secrets loader. Every env-derived secret goes through here so the
 * server fails loudly at startup if any is missing, instead of booting with the
 * old hardcoded defaults that leaked into production.
 *
 * Dev ergonomics: when NODE_ENV is not 'production' we accept values from .env
 * only — no fallbacks. The dev/.env.example file ships known dev values so the
 * dev experience is still one `cp .env.example .env` away.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Variavel de ambiente obrigatoria ausente: ${name}. ` +
      `Defina em .env (copie de .env.example se necessario).`
    );
  }
  return value.trim();
}

export const JWT_SECRET = required('JWT_SECRET');
export const ECP_PAY_API_KEY = required('ECP_PAY_API_KEY');
export const ECP_PAY_WEBHOOK_SECRET = required('ECP_PAY_WEBHOOK_SECRET');
