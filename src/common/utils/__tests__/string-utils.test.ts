import {
    isValidJSON,
    formatUsdValue,
    formatNumber,
    convertUnicodeToAscii,
    ensureHexPrefix,
    stripHexPrefix,
    isValidHex,
    splitStxAddressIntoParts,
} from '../string-utils';

describe('string-utils', () => {
    describe('isValidJSON', () => {
        it('should return true for valid JSON object', () => {
            expect(isValidJSON('{"key": "value"}')).toBe(true);
        });

        it('should return true for valid JSON array', () => {
            expect(isValidJSON('[1, 2, 3]')).toBe(true);
        });

        it('should return true for valid JSON string', () => {
            expect(isValidJSON('"hello"')).toBe(true);
        });

        it('should return true for valid JSON number', () => {
            expect(isValidJSON('123')).toBe(true);
        });

        it('should return true for valid JSON boolean', () => {
            expect(isValidJSON('true')).toBe(true);
            expect(isValidJSON('false')).toBe(true);
        });

        it('should return true for valid JSON null', () => {
            expect(isValidJSON('null')).toBe(true);
        });

        it('should return false for invalid JSON', () => {
            expect(isValidJSON('{invalid}')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isValidJSON('')).toBe(false);
        });
    });

    describe('formatUsdValue', () => {
        it('should format number as USD currency', () => {
            const result = formatUsdValue(1234.56);
            expect(result).toContain('1,234.56');
        });

        it('should handle zero value', () => {
            const result = formatUsdValue(0);
            expect(result).toContain('0.00');
        });

        it('should handle negative values', () => {
            const result = formatUsdValue(-100);
            expect(result).toContain('100.00');
        });

        it('should respect custom fraction digits', () => {
            const result = formatUsdValue(1234.5678, 4, 4);
            expect(result).toContain('1234.5678');
        });
    });

    describe('formatNumber', () => {
        it('should format number with thousand separators', () => {
            const result = formatNumber(1234567);
            expect(result).toContain('1,234,567');
        });

        it('should handle zero', () => {
            expect(formatNumber(0)).toBe('0');
        });

        it('should respect custom fraction digits', () => {
            const result = formatNumber(1234.5678, 2, 2);
            expect(result).toContain('1234.57');
        });
    });

    describe('convertUnicodeToAscii', () => {
        it('should convert accented characters to ASCII', () => {
            expect(convertUnicodeToAscii('café')).toBe('cafe');
        });

        it('should handle string without special characters', () => {
            expect(convertUnicodeToAscii('hello')).toBe('hello');
        });

        it('should handle multiple accented characters', () => {
            expect(convertUnicodeToAscii('naïve résumé')).toBe('naive resume');
        });
    });

    describe('hex utilities', () => {
        describe('ensureHexPrefix', () => {
            it('should add 0x prefix if not present', () => {
                expect(ensureHexPrefix('abc123')).toBe('0xabc123');
            });

            it('should not duplicate 0x prefix', () => {
                expect(ensureHexPrefix('0xabc123')).toBe('0xabc123');
            });
        });

        describe('stripHexPrefix', () => {
            it('should remove 0x prefix', () => {
                expect(stripHexPrefix('0xabc123')).toBe('abc123');
            });

            it('should return unchanged if no prefix', () => {
                expect(stripHexPrefix('abc123')).toBe('abc123');
            });
        });

        describe('isValidHex', () => {
            it('should return true for valid hex with prefix', () => {
                expect(isValidHex('0xabc123')).toBe(true);
            });

            it('should return false for hex without prefix', () => {
                expect(isValidHex('abc123')).toBe(false);
            });

            it('should return false for invalid hex characters', () => {
                expect(isValidHex('0xGHI')).toBe(false);
            });
        });
    });

    describe('splitStxAddressIntoParts', () => {
        it('should split address into 4-character parts', () => {
            const result = splitStxAddressIntoParts('SP123456789012');
            expect(result.length).toBeGreaterThan(1);
            expect(result[0]).toHaveLength(4);
        });

        it('should handle short address', () => {
            const result = splitStxAddressIntoParts('SP12');
            expect(result).toEqual(['SP12']);
        });

        it('should combine last short piece with previous', () => {
            const result = splitStxAddressIntoParts('SP12345678901');
            const lastPart = result[result.length - 1];
            expect(lastPart.length).toBeGreaterThanOrEqual(4);
        });
    });
});
