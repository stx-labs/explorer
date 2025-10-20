import '@testing-library/jest-dom';

import { convertUnicodeToAscii, isValidJSON, splitStxAddressIntoParts } from '../string-utils';

describe(convertUnicodeToAscii.name, () => {
  it('should convert unicode to ascii', () => {
    expect(convertUnicodeToAscii('Á')).toEqual('A');
    expect(convertUnicodeToAscii('Û')).toEqual('U');
    expect(convertUnicodeToAscii('ê')).toEqual('e');
    expect(convertUnicodeToAscii('Ê')).toEqual('E');
    expect(convertUnicodeToAscii('Î')).toEqual('I');
    expect(convertUnicodeToAscii('ô')).toEqual('o');
    expect(convertUnicodeToAscii('Ô')).toEqual('O');
    expect(convertUnicodeToAscii('Ô')).not.toEqual('o');
    expect(convertUnicodeToAscii('û')).toEqual('u');
  });
});

describe(splitStxAddressIntoParts.name, () => {
  it('should handle address with exactly divisible length', () => {
    const address = 'ABCDEFGHIJKLMNOP'; // 16 characters, exactly divisible by 4
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['ABCD', 'EFGH', 'IJKL', 'MNOP']);
  });

  it('should handle short address (less than 4 characters)', () => {
    const address = 'ABC';
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['ABC']);
  });

  it('should handle address with 1 character remainder', () => {
    const address = 'ABCDEFGHI'; // 9 characters, 1 remainder
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['ABCD', 'EFGHI']);
  });

  it('should handle address with 2 character remainder', () => {
    const address = 'ABCDEFGHIJ'; // 10 characters, 2 remainder
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['ABCD', 'EFGHIJ']);
  });

  it('should handle address with 3 character remainder', () => {
    const address = 'ABCDEFGHIJK'; // 11 characters, 3 remainder
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['ABCD', 'EFGHIJK']);
  });

  it('should handle empty string', () => {
    const address = '';
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual([]);
  });

  it('should handle single character', () => {
    const address = 'A';
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual(['A']);
  });

  it('should handle typical Stacks mainnet address', () => {
    const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual([
      'SP2J',
      '6ZY4',
      '8GV1',
      'EZ5V',
      '2V5R',
      'B9MP',
      '66SW',
      '86PY',
      'KKNR',
      'V9EJ7',
    ]);
  });

  it('should handle typical Stacks testnet address', () => {
    const address = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const result = splitStxAddressIntoParts(address);

    expect(result).toEqual([
      'ST1S',
      'J3DT',
      'E5DN',
      '7X54',
      'YDH5',
      'D64R',
      '3BCB',
      '6A2A',
      'G2ZQ',
      '8YPD5',
    ]);
  });

  describe('isValidJSON', () => {
    describe('should return true for valid JSON', () => {
      test('valid JSON object', () => {
        expect(isValidJSON('{"name": "John", "age": 30}')).toBe(true);
      });

      test('valid JSON array', () => {
        expect(isValidJSON('["apple", "banana", "cherry"]')).toBe(true);
      });

      test('valid JSON string', () => {
        expect(isValidJSON('"hello world"')).toBe(true);
      });

      test('valid JSON number', () => {
        expect(isValidJSON('123')).toBe(true);
        expect(isValidJSON('123.45')).toBe(true);
        expect(isValidJSON('-123')).toBe(true);
      });

      test('valid JSON boolean', () => {
        expect(isValidJSON('true')).toBe(true);
        expect(isValidJSON('false')).toBe(true);
      });

      test('valid JSON null', () => {
        expect(isValidJSON('null')).toBe(true);
      });

      test('valid nested JSON object', () => {
        expect(
          isValidJSON('{"user": {"name": "John", "details": {"age": 30, "active": true}}}')
        ).toBe(true);
      });

      test('valid JSON with whitespace', () => {
        expect(isValidJSON('  {"name": "John"}  ')).toBe(true);
      });

      test('valid empty JSON object', () => {
        expect(isValidJSON('{}')).toBe(true);
      });

      test('valid empty JSON array', () => {
        expect(isValidJSON('[]')).toBe(true);
      });
    });

    describe('should return false for invalid JSON', () => {
      test('unquoted string', () => {
        expect(isValidJSON('hello world')).toBe(false);
      });

      test('single quoted string', () => {
        expect(isValidJSON("'hello world'")).toBe(false);
      });

      test('unquoted object keys', () => {
        expect(isValidJSON('{name: "John"}')).toBe(false);
      });

      test('trailing comma in object', () => {
        expect(isValidJSON('{"name": "John",}')).toBe(false);
      });

      test('trailing comma in array', () => {
        expect(isValidJSON('["apple", "banana",]')).toBe(false);
      });

      test('unclosed object', () => {
        expect(isValidJSON('{"name": "John"')).toBe(false);
      });

      test('unclosed array', () => {
        expect(isValidJSON('["apple", "banana"')).toBe(false);
      });

      test('invalid escape sequence', () => {
        expect(isValidJSON('{"message": "hello\\world"}')).toBe(false);
      });

      test('undefined value', () => {
        expect(isValidJSON('{"value": undefined}')).toBe(false);
      });

      test('function value', () => {
        expect(isValidJSON('{"fn": function() {}}')).toBe(false);
      });

      test('empty string', () => {
        expect(isValidJSON('')).toBe(false);
      });

      test('only whitespace', () => {
        expect(isValidJSON('   ')).toBe(false);
      });

      test('mixed valid and invalid', () => {
        expect(isValidJSON('{"valid": true} invalid text')).toBe(false);
      });

      test('JavaScript object literal', () => {
        expect(isValidJSON('{name: "John", age: 30}')).toBe(false);
      });

      test('regular sentence', () => {
        expect(isValidJSON('The token resonates with power')).toBe(false);
      });

      test('number with text', () => {
        expect(isValidJSON('123abc')).toBe(false);
      });

      test('malformed number', () => {
        expect(isValidJSON('123.')).toBe(false);
      });
    });

    describe('edge cases', () => {
      test('very large JSON', () => {
        const largeObject = { data: new Array(1000).fill('test') };
        expect(isValidJSON(JSON.stringify(largeObject))).toBe(true);
      });

      test('deeply nested JSON', () => {
        let nested: any = {};
        let current = nested;
        for (let i = 0; i < 10; i++) {
          current.nested = {};
          current = current.nested;
        }
        current.value = 'deep';
        expect(isValidJSON(JSON.stringify(nested))).toBe(true);
      });

      test('JSON with unicode characters', () => {
        expect(isValidJSON('{"emoji": "🚀", "chinese": "你好"}')).toBe(true);
      });

      test('JSON with special characters', () => {
        expect(isValidJSON('{"newline": "line1\\nline2", "tab": "col1\\tcol2"}')).toBe(true);
      });
    });
  });
});
