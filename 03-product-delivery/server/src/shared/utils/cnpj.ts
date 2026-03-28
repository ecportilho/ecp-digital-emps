/**
 * CNPJ validation using modulo 11 algorithm with 2 check digits.
 */

function stripCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function allSameDigit(digits: string): boolean {
  return digits.split('').every((d) => d === digits[0]);
}

export function validateCnpj(cnpj: string): boolean {
  const stripped = stripCnpj(cnpj);

  if (stripped.length !== 14) return false;
  if (allSameDigit(stripped)) return false;

  // First check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(stripped[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (Number(stripped[12]) !== digit1) return false;

  // Second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(stripped[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  if (Number(stripped[13]) !== digit2) return false;

  return true;
}

/**
 * Format CNPJ: 12345678000195 -> 12.345.678/0001-95
 */
export function formatCnpj(cnpj: string): string {
  const stripped = stripCnpj(cnpj);
  return stripped.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}
