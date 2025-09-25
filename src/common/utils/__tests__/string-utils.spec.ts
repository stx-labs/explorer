import { convertUnicodeToAscii, splitStxAddressIntoParts } from '../string-utils';

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
});
