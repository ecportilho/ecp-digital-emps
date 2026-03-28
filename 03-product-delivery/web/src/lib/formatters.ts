/**
 * Format CNPJ: 12345678000195 -> 12.345.678/0001-95
 */
export function formatCnpj(cnpj: string): string {
  const stripped = cnpj.replace(/\D/g, '');
  return stripped.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Format currency in BRL: 875000 (cents) -> "R$ 8.750,00"
 */
export function formatCurrency(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Format date: "2026-03-28" -> "28/03/2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date with time: "2026-03-28T10:30:00Z" -> "28/03/2026 10:30"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format CPF: 12345678901 -> 123.456.789-01
 */
export function formatCpf(cpf: string): string {
  const stripped = cpf.replace(/\D/g, '');
  return stripped.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}

/**
 * Format document (auto-detect CPF or CNPJ)
 */
export function formatDocument(doc: string): string {
  const stripped = doc.replace(/\D/g, '');
  if (stripped.length === 11) return formatCpf(stripped);
  if (stripped.length === 14) return formatCnpj(stripped);
  return doc;
}
