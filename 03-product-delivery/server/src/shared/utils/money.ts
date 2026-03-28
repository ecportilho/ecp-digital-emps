/**
 * Convert centavos (integer) to BRL formatted string.
 * Example: 875000 -> "8.750,00"
 */
export function centsToBrl(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Convert BRL value (float) to centavos (integer).
 * Example: 8750.00 -> 875000
 */
export function brlToCents(value: number): number {
  return Math.round(value * 100);
}
