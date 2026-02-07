'use client';

/**
 * Converts Unicode characters with diacritical marks to their ASCII equivalents.
 * 
 * @param str - The string containing Unicode characters
 * @returns The string with Unicode characters normalized to ASCII
 * @example
 * convertUnicodeToAscii('café') // Returns: 'cafe'
 */
export function convertUnicodeToAscii(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ensures a hex string has the '0x' prefix.
 * 
 * @param value - The hex string to check
 * @returns The hex string with '0x' prefix
 * @example
 * ensureHexPrefix('abc123') // Returns: '0xabc123'
 * ensureHexPrefix('0xabc123') // Returns: '0xabc123'
 */
export function ensureHexPrefix(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

/**
 * Removes the '0x' prefix from a hex string if present.
 * 
 * @param value - The hex string to strip
 * @returns The hex string without '0x' prefix
 */
export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

/**
 * Validates if a string is a valid hexadecimal value with '0x' prefix.
 * 
 * @param value - The string to validate
 * @returns True if the string is a valid hex value
 */
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

/**
 * Validates if a string is valid JSON.
 * 
 * @param str - The string to validate
 * @returns True if the string is valid JSON, false otherwise
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Formats a number as a USD currency string.
 * 
 * @param value - The number to format
 * @param minimumFractionDigits - Minimum decimal places (default: 2)
 * @param maximumFractionDigits - Maximum decimal places (default: 2)
 * @returns Formatted USD currency string
 * @example
 * formatUsdValue(1234.56) // Returns: '$1,234.56'
 */
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

/**
 * Formats a number with locale-specific thousand separators.
 * 
 * @param value - The number to format
 * @param minimumFractionDigits - Minimum decimal places (default: 0)
 * @param maximumFractionDigits - Maximum decimal places (default: 0)
 * @returns Formatted number string
 * @example
 * formatNumber(1234567) // Returns: '1,234,567'
 */
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
