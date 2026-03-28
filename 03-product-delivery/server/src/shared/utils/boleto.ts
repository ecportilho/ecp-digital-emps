/**
 * Mock FEBRABAN boleto generation for MVP.
 * In production, this would integrate with a banking provider.
 */

import { generateId } from './uuid.js';

/**
 * Generate a mock 47-digit barcode following FEBRABAN structure.
 * Format: BBBMC.CCCCD DDDDD.DDDDD DDDDD.DDDDDD V FFFFFFFF
 * B=Bank(3), M=Currency(1), C=Free field, D=Digits, V=DV, F=Due factor + amount
 */
export function generateBarcode(amount: number, dueDate: string): string {
  const bankCode = '001'; // Mock bank code
  const currency = '9';   // BRL
  const dueFactor = calculateDueFactor(dueDate);
  const amountStr = String(amount).padStart(10, '0');
  const freeField = generateId().replace(/-/g, '').substring(0, 25);

  // Simplified barcode without real DV calculation (MVP)
  const baseCode = `${bankCode}${currency}${freeField}${dueFactor}${amountStr}`;

  // Calculate modulo 11 DV for the whole barcode
  const dv = calculateMod11(baseCode);

  return `${bankCode}${currency}${dv}${freeField}${dueFactor}${amountStr}`;
}

/**
 * Generate digitable line from barcode.
 * Splits the barcode into groups with check digits.
 */
export function generateDigitableLine(barcode: string): string {
  if (barcode.length < 44) {
    const padded = barcode.padEnd(47, '0');
    return `${padded.substring(0, 5)}.${padded.substring(5, 10)} ${padded.substring(10, 15)}.${padded.substring(15, 21)} ${padded.substring(21, 26)}.${padded.substring(26, 32)} ${padded.substring(32, 33)} ${padded.substring(33, 47)}`;
  }

  const group1 = barcode.substring(0, 5);
  const group2 = barcode.substring(5, 15);
  const group3 = barcode.substring(15, 26);
  const dv = barcode.substring(4, 5);
  const rest = barcode.substring(26);

  return `${group1}.${group2.substring(0, 5)} ${group2.substring(5)}.${group3.substring(0, 6)} ${group3.substring(6)}.${rest.substring(0, 6)} ${dv} ${rest.substring(6)}`;
}

function calculateDueFactor(dueDate: string): string {
  const baseDate = new Date('1997-10-07');
  const due = new Date(dueDate);
  const diffMs = due.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return String(Math.max(0, diffDays)).padStart(4, '0');
}

function calculateMod11(code: string): string {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  const digits = code.split('').reverse();

  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * weights[i % weights.length];
  }

  const remainder = sum % 11;
  const dv = 11 - remainder;

  if (dv === 0 || dv === 10 || dv === 11) return '1';
  return String(dv);
}
