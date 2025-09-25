import { render, screen } from '@testing-library/react';

import { getTxTypeColor, getTxTypeIcon, getTxTypeLabel } from '../transactions';
import {
  abbreviateNumber,
  addSepBetweenStrings,
  capitalize,
  formatNumber,
  formatStacksAmount,
  ftDecimals,
  getAssetNameParts,
  getContractName,
  getFtDecimalAdjustedBalance,
  getFungibleAssetName,
  getLocaleDecimalSeparator,
  getMemoString,
  getUsdValue,
  hasBnsExtension,
  hexToString,
  isJSONString,
  isNumeric,
  microStxToStx,
  microToStacks,
  microToStacksFormatted,
  removeTrailingSlash,
  semanticTokenToCssVar,
  shortenHexDeprecated,
  stacksToMicro,
  stringToHslColor,
  truncateContractName,
  truncateHex,
  truncateMiddle,
  truncateStxAddress,
  truncateStxContractId,
  truncateText,
  validateAssettId,
  validateStacksAddress,
  validateStacksContractId,
} from '../utils';

jest.mock('@phosphor-icons/react', () => ({
  PhoneCall: () => <div data-testid="phone-call">PhoneCall</div>,
  Cube: () => <div data-testid="cube">Cube</div>,
  Question: () => <div data-testid="question">Question</div>,
  TransferIcon: () => <div data-testid="transfer-icon">TransferIcon</div>,
  ClarityIcon: () => <div data-testid="clarity-icon">ClarityIcon</div>,
  ArrowsClockwise: () => <div data-testid="arrows-clockwise">ArrowsClockwise</div>,
}));

jest.mock('@/ui/icons/TransferIcon', () => () => (
  <div data-testid="transfer-icon">TransferIcon</div>
));

jest.mock('@/ui/icons/ClarityIcon', () => () => <div data-testid="clarity-icon">ClarityIcon</div>);

describe('semanticTokenToCssVar', () => {
  test('should convert dot notation tokens to CSS variables', () => {
    expect(semanticTokenToCssVar('colors.primary')).toBe('var(--stacks-colors-colors-primary)');
  });

  test('should convert camelCase tokens to kebab case CSS variables', () => {
    expect(semanticTokenToCssVar('textPrimary')).toBe('var(--stacks-colors-text-primary)');
  });

  test('should handle mixed camelCase and dot notation', () => {
    expect(semanticTokenToCssVar('colors.textPrimary')).toBe(
      'var(--stacks-colors-colors-text-primary)'
    );
  });
});

describe('getTxTypeColor', () => {
  test('should return correct color for token_transfer', () => {
    expect(getTxTypeColor('token_transfer')).toBe(
      'var(--stacks-colors-transaction-types-token-transfer)'
    );
  });

  test('should return correct color for contract_call', () => {
    expect(getTxTypeColor('contract_call')).toBe(
      'var(--stacks-colors-transaction-types-contract-call)'
    );
  });

  test('should return correct color for smart_contract', () => {
    expect(getTxTypeColor('smart_contract')).toBe(
      'var(--stacks-colors-transaction-types-contract-deploy)'
    );
  });

  test('should return correct color for tenure_change', () => {
    expect(getTxTypeColor('tenure_change')).toBe(
      'var(--stacks-colors-transaction-types-tenure-change)'
    );
  });

  test('should return correct color for coinbase', () => {
    expect(getTxTypeColor('coinbase')).toBe('var(--stacks-colors-transaction-types-coinbase)');
  });

  test('should return token_transfer color for unknown transaction type', () => {
    expect(getTxTypeColor('unknown_type')).toBe(
      'var(--stacks-colors-transaction-types-token-transfer)'
    );
  });
});

describe('getTxTypeLabel', () => {
  test('should return correct label for token_transfer', () => {
    expect(getTxTypeLabel('token_transfer')).toBe('Token transfer');
  });

  test('should return correct label for contract_call', () => {
    expect(getTxTypeLabel('contract_call')).toBe('Contract call');
  });

  test('should return correct label for smart_contract', () => {
    expect(getTxTypeLabel('smart_contract')).toBe('Contract deploy');
  });

  test('should return correct label for tenure_change', () => {
    expect(getTxTypeLabel('tenure_change')).toBe('Tenure change');
  });

  test('should return correct label for coinbase', () => {
    expect(getTxTypeLabel('coinbase')).toBe('Coinbase');
  });

  test('should return Unknown for unknown transaction type', () => {
    expect(getTxTypeLabel('unknown_type')).toBe('Unknown');
  });
});

describe('getTxTypeIcon', () => {
  test('should return ArrowsLeftRight icon for token_transfer', () => {
    const icon = getTxTypeIcon('token_transfer');
    render(<>{icon}</>);
    expect(screen.getByTestId('transfer-icon')).toBeInTheDocument();
  });

  test('should return PhoneCall icon for contract_call', () => {
    const icon = getTxTypeIcon('contract_call');
    render(<>{icon}</>);
    expect(screen.getByTestId('phone-call')).toBeInTheDocument();
  });

  test('should return ClarityIcon for smart_contract', () => {
    const icon = getTxTypeIcon('smart_contract');
    render(<>{icon}</>);
    expect(screen.getByTestId('clarity-icon')).toBeInTheDocument();
  });

  test('should return ArrowsClockwise icon for tenure_change', () => {
    const icon = getTxTypeIcon('tenure_change');
    render(<>{icon}</>);
    expect(screen.getByTestId('arrows-clockwise')).toBeInTheDocument();
  });

  test('should return Question icon for unknown transaction type', () => {
    const icon = getTxTypeIcon('unknown_type');
    render(<>{icon}</>);
    expect(screen.getByTestId('question')).toBeInTheDocument();
  });

  test('should return Cube icon for coinbase', () => {
    const icon = getTxTypeIcon('coinbase');
    render(<>{icon}</>);
    expect(screen.getByTestId('cube')).toBeInTheDocument();
  });

  test('should return TransferIcon icon for token_transfer', () => {
    const icon = getTxTypeIcon('token_transfer');
    render(<>{icon}</>);
    expect(screen.getByTestId('transfer-icon')).toBeInTheDocument();
  });
});

describe('formatNumber', () => {
  test('should return "0suffix" when num is 0', () => {
    expect(formatNumber(0, 1, 'B')).toBe('0B');
    expect(formatNumber(0, 1000, 'K')).toBe('0K');
    expect(formatNumber(0, 1000000, 'M', 2)).toBe('0M');
  });

  test('should format with decimals when provided', () => {
    expect(formatNumber(1234567, 1000000, 'M', 2)).toBe('1.23M');
    expect(formatNumber(5432100, 1000000, 'M', 2)).toBe('5.43M');
    expect(formatNumber(1234, 1000, 'K', 1)).toBe('1.2K');
    expect(formatNumber(9876, 1000, 'K', 3)).toBe('9.876K');
  });

  test('should format without specific decimal places when decimals is undefined', () => {
    const result = formatNumber(1234.5678, 1000, 'K');
    expect(result).toContain('1.2');
    expect(result).toContain('K');
    expect(result).not.toContain('.0K');
  });
});

describe('shortenHexDeprecated', () => {
  test('should shorten hex string with default length', () => {
    expect(shortenHexDeprecated('0x1234567890abcdef')).toBe('0x1234…cdef');
  });

  test('should shorten hex string with custom length', () => {
    expect(shortenHexDeprecated('0x1234567890abcdef', 6)).toBe('0x123456…abcdef');
  });
});

describe('truncateHex', () => {
  test('should truncate hex string with prefix', () => {
    expect(truncateHex('0x1234567890abcdef', 4, 4, true)).toBe('0x1234…cdef');
  });

  test('should truncate hex string without prefix', () => {
    expect(truncateHex('0x1234567890abcdef', 4, 4, false)).toBe('0x12…cdef');
  });

  test('should return original string if no 0x prefix', () => {
    expect(truncateHex('1234567890abcdef', 4, 4)).toBe('1234567890abcdef');
  });

  test('should handle empty string', () => {
    expect(truncateHex('', 4, 4)).toBe('');
  });
});

describe('truncateMiddle', () => {
  test('should truncate middle of string', () => {
    expect(truncateMiddle('1234567890', 3, 3)).toBe('123…890');
  });

  test('should handle empty string', () => {
    expect(truncateMiddle('', 3, 3)).toBe('');
  });
});

describe('truncateContractName', () => {
  test('should truncate contract name with start length only', () => {
    expect(truncateContractName('very-long-contract-name', 5)).toBe('very-...');
  });

  test('should truncate contract name with start and end length', () => {
    expect(truncateContractName('very-long-contract-name', 5, 4)).toBe('very-…name');
  });

  test('should return original if no start length provided', () => {
    expect(truncateContractName('contract-name')).toBe('contract-name');
  });

  test('should return original if truncated would be longer', () => {
    expect(truncateContractName('short', 10, 10)).toBe('short');
  });
});

describe('truncateStxAddress', () => {
  test('should truncate valid STX address', () => {
    const address = 'SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335';
    expect(truncateStxAddress(address)).toBe('SP3D…EH335');
  });

  test('should return empty string for invalid address', () => {
    expect(truncateStxAddress('invalid-address')).toBe('');
  });
});

describe('truncateStxContractId', () => {
  test('should truncate valid contract ID', () => {
    const contractId = 'SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract-name';
    expect(truncateStxContractId(contractId)).toBe('SP3D…EH335.contract-name');
  });

  test('should return empty string for invalid contract ID', () => {
    expect(truncateStxContractId('invalid')).toBe('');
  });
});

describe('truncateText', () => {
  test('should truncate text longer than limit', () => {
    expect(truncateText('This is a very long text', 10)).toBe('This is...');
  });

  test('should return original text if within limit', () => {
    expect(truncateText('Short', 10)).toBe('Short');
  });
});

describe('formatStacksAmount', () => {
  test('should format stacks amount with proper decimals', () => {
    expect(formatStacksAmount(1234.56789)).toBe('1,234.56789');
  });

  test('should format string input', () => {
    expect(formatStacksAmount('1000')).toBe('1000');
  });
});

describe('microToStacks', () => {
  test('should convert microstacks to stacks', () => {
    expect(microToStacks(1000000)).toBe(1);
  });

  test('should handle string input', () => {
    expect(microToStacks('2000000')).toBe(2);
  });
});

describe('microToStacksFormatted', () => {
  test('should convert and format microstacks to stacks', () => {
    expect(microToStacksFormatted(1500000)).toBe('1.50');
  });
});

describe('getUsdValue', () => {
  test('should calculate USD value for stacks amount', () => {
    expect(getUsdValue(10, 2.5)).toBe('$25.00');
  });

  test('should calculate USD value for microstacks amount', () => {
    expect(getUsdValue(1000000, 2.5, true)).toBe('$2.50');
  });
});

describe('stacksToMicro', () => {
  test('should convert stacks to microstacks', () => {
    expect(stacksToMicro(1)).toBe(1000000);
  });

  test('should handle string input', () => {
    expect(stacksToMicro('2.5')).toBe(2500000);
  });

  test('should handle zero and undefined', () => {
    expect(stacksToMicro(0)).toBe(0);
    expect(stacksToMicro('')).toBe(0);
  });
});

describe('getContractName', () => {
  test('should extract contract name from fully qualified name', () => {
    expect(getContractName('address.contract-name')).toBe('contract-name');
  });
});

describe('getFungibleAssetName', () => {
  test('should extract fungible asset name', () => {
    expect(getFungibleAssetName('address.contract::token')).toBe('token');
  });
});

describe('getAssetNameParts', () => {
  test('should split asset name into parts', () => {
    const result = getAssetNameParts('address.contract::asset');
    expect(result).toEqual({
      address: 'address',
      contract: 'contract',
      asset: 'asset',
    });
  });
});

describe('getMemoString', () => {
  test('should decode memo string', () => {
    const hexMemo = '48656c6c6f'; // "Hello" in hex
    expect(getMemoString(hexMemo)).toBe('Hello');
  });

  test('should return empty string for invalid hex', () => {
    expect(getMemoString('invalid')).toBe('');
  });
});

describe('addSepBetweenStrings', () => {
  test('should add separator between strings', () => {
    expect(addSepBetweenStrings(['a', 'b', 'c'])).toBe('a ∙ b ∙ c');
  });

  test('should use custom separator', () => {
    expect(addSepBetweenStrings(['a', 'b'], '-')).toBe('a - b');
  });

  test('should filter out undefined values', () => {
    expect(addSepBetweenStrings(['a', undefined, 'c'])).toBe('a ∙ c');
  });
});

describe('stringToHslColor', () => {
  test('should generate consistent HSL color for same string', () => {
    const color1 = stringToHslColor('test', 50, 50);
    const color2 = stringToHslColor('test', 50, 50);
    expect(color1).toBe(color2);
  });

  test('should generate different colors for different strings', () => {
    const color1 = stringToHslColor('test1', 50, 50);
    const color2 = stringToHslColor('test2', 50, 50);
    expect(color1).not.toBe(color2);
  });
});

describe('capitalize', () => {
  test('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('getFtDecimalAdjustedBalance', () => {
  test('should adjust balance for decimals', () => {
    expect(getFtDecimalAdjustedBalance(1000, 3)).toBe(1);
  });
});

describe('ftDecimals', () => {
  test('should format with decimals', () => {
    expect(ftDecimals(1000, 2)).toBe('10');
  });
});

describe('getLocaleDecimalSeparator', () => {
  test('should return decimal separator', () => {
    const separator = getLocaleDecimalSeparator();
    expect(typeof separator).toBe('string');
    expect(separator?.length).toBe(1);
  });
});

describe('isNumeric', () => {
  test('should return true for numeric strings', () => {
    expect(isNumeric('123')).toBe(true);
    expect(isNumeric('123.45')).toBe(false); // function only accepts integers
  });

  test('should return false for non-numeric strings', () => {
    expect(isNumeric('abc')).toBe(false);
    expect(isNumeric('12a')).toBe(false);
  });
});

describe('hexToString', () => {
  test('should convert hex to string', () => {
    expect(hexToString('48656c6c6f')).toBe('Hello');
  });

  test('should handle 0x prefix', () => {
    expect(hexToString('0x48656c6c6f')).toBe('Hello');
  });

  test('should handle undefined input', () => {
    expect(hexToString()).toBe('');
  });
});

describe('abbreviateNumber', () => {
  test('should abbreviate large numbers', () => {
    expect(abbreviateNumber(1500)).toBe('1,500'); // Under 1M, no abbreviation
    expect(abbreviateNumber(1500000)).toBe('1.5M');
    expect(abbreviateNumber(1500000000)).toBe('1.5B');
  });

  test('should handle small numbers', () => {
    expect(abbreviateNumber(50)).toBe('50');
  });
});

describe('microStxToStx', () => {
  test('should convert microstx to stx', () => {
    expect(microStxToStx(1000000)).toBe(1);
  });

  test('should handle string input', () => {
    expect(microStxToStx('2000000')).toBe(2);
  });
});

describe('isJSONString', () => {
  test('should return true for valid JSON', () => {
    expect(isJSONString('{"key": "value"}')).toBe(true);
    expect(isJSONString('[]')).toBe(true);
  });

  test('should return false for invalid JSON', () => {
    expect(isJSONString('invalid')).toBe(false);
    expect(isJSONString('{key: value}')).toBe(false);
  });
});

describe('removeTrailingSlash', () => {
  test('should remove trailing slash', () => {
    expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com');
  });

  test('should handle string without trailing slash', () => {
    expect(removeTrailingSlash('https://example.com')).toBe('https://example.com');
  });

  test('should handle undefined input', () => {
    expect(removeTrailingSlash()).toBe('');
  });
});

describe('hasBnsExtension', () => {
  test('should validate BNS names', () => {
    expect(hasBnsExtension('name.btc')).toBe(true);
    expect(hasBnsExtension('invalid.com')).toBe(false);
    expect(hasBnsExtension()).toBe(false);
  });
});

describe('validateStacksAddress', () => {
  test('should validate Stacks addresses', () => {
    expect(validateStacksAddress('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335')).toBe(true);
    expect(validateStacksAddress('invalid')).toBe(false);
    expect(validateStacksAddress()).toBe(false);
  });
});

describe('validateStacksContractId', () => {
  test('should validate contract IDs', () => {
    expect(validateStacksContractId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract')).toBe(
      true
    );
    expect(validateStacksContractId('invalid')).toBe(false);
    expect(validateStacksContractId()).toBe(false);
  });
});

describe('validateAssettId', () => {
  test('should validate valid asset IDs', () => {
    // Valid asset ID with proper format: address.contract::asset
    expect(
      validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.token-contract::my-token')
    ).toBe(true);
    expect(validateAssettId('SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.arkadiko-token::diko')).toBe(
      true
    );
    expect(validateAssettId('SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststx-token::ststx')).toBe(
      true
    );
  });

  test('should reject empty or falsy asset IDs', () => {
    expect(validateAssettId('')).toBe(false);
    expect(validateAssettId(null as any)).toBe(false);
    expect(validateAssettId(undefined as any)).toBe(false);
  });

  test('should reject asset IDs with invalid format', () => {
    // Missing asset name (no ::)
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.token-contract')).toBe(
      false
    );

    // Missing contract name
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335::my-token')).toBe(false);

    // Missing address
    expect(validateAssettId('.token-contract::my-token')).toBe(false);

    // Invalid format (no periods or colons)
    expect(validateAssettId('invalid-asset-id')).toBe(false);

    // Too many parts
    expect(
      validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract.extra::asset')
    ).toBe(false);
  });

  test('should reject asset IDs with invalid Stacks addresses', () => {
    // Invalid address format
    expect(validateAssettId('INVALID_ADDRESS.token-contract::my-token')).toBe(false);
    expect(validateAssettId('123.token-contract::my-token')).toBe(false);
    expect(validateAssettId('short.token-contract::my-token')).toBe(false);
  });

  test('should reject asset IDs missing required parts', () => {
    // Missing asset name after ::
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.token-contract::')).toBe(
      false
    );

    // Missing contract name before ::
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.::my-token')).toBe(false);

    // Only address
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335')).toBe(false);
  });

  test('should handle edge cases and malformed inputs', () => {
    // Multiple :: separators
    expect(
      validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract::asset::extra')
    ).toBe(false);

    // Special characters in parts
    expect(
      validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract-name::asset-name')
    ).toBe(true);
    expect(
      validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract_name::asset_name')
    ).toBe(true);

    // Whitespace
    expect(validateAssettId(' SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract::asset ')).toBe(
      false
    );
    expect(validateAssettId('SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.contract::asset name')).toBe(
      true
    );
  });

  test('should handle exceptions gracefully', () => {
    // Test that function returns false when getAssetNameParts throws
    // This would happen if the input format is completely malformed
    expect(validateAssettId('completely::malformed::input::with::too::many::parts')).toBe(false);
  });
});
