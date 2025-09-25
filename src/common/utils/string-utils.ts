'use client';

export function convertUnicodeToAscii(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function ensureHexPrefix(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

export function isValidHex(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value);
}
export function splitStxAddressIntoParts(address: string): string[] {
  const parts: string[] = [];
  for (let i = 0; i < address.length; i += 4) {
    parts.push(address.slice(i, i + 4));
  }

  // If the last piece is less than 4 characters, append it to the previous piece
  if (parts.length > 1 && parts[parts.length - 1].length < 4) {
    const lastPiece = parts.pop() || '';
    parts[parts.length - 1] += lastPiece;
  }

  return parts;
}

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export function formatUsdValue(
  value: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatNumber(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}
