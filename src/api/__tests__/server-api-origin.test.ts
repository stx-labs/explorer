import { getAllowedStakingApiUrl, isTrustedStacksApiUrl } from '../server-api-origin';

jest.mock('@/common/constants/env', () => ({
  DEFAULT_MAINNET_SERVER: 'https://api.hiro.so',
  DEFAULT_TESTNET_SERVER: 'https://api.testnet.hiro.so',
}));

test('uses configured networks and canonicalizes API overrides', () => {
  expect(getAllowedStakingApiUrl('mainnet')).toBe('https://api.hiro.so');
  expect(getAllowedStakingApiUrl('testnet')).toBe('https://api.testnet.hiro.so');
  expect(getAllowedStakingApiUrl('testnet', 'https://API.TESTNET.HIRO.SO:443/')).toBe(
    'https://api.testnet.hiro.so'
  );
  expect(isTrustedStacksApiUrl('https://api.hiro.so/extended/v1/tx?limit=5')).toBe(true);
  expect(getAllowedStakingApiUrl('testnet', 'https://private-1.example/api/')).toBe(
    'https://private-1.example/api'
  );
  expect(getAllowedStakingApiUrl('testnet', 'http://localhost:3999')).toBe('http://localhost:3999');
});

test.each(['devnet', 'unknown', '', 'MAINNET', ' testnet '])(
  'rejects unsupported chain %j even with a configured API override',
  chain => {
    expect(getAllowedStakingApiUrl(chain)).toBeUndefined();
    expect(getAllowedStakingApiUrl(chain, 'https://api.hiro.so')).toBeUndefined();
    expect(getAllowedStakingApiUrl(chain, 'https://api.testnet.hiro.so')).toBeUndefined();
  }
);

test.each([
  'https://custom.example',
  'https://api.hiro.so.attacker.example',
  'https://api.hiro.so@attacker.example',
  'https://attacker@api.hiro.so',
  'https://api.hiro.so:8443',
  'http://api.hiro.so',
  'http://127.0.0.1:3999',
  '//api.hiro.so',
  'file:///etc/passwd',
  'not a URL',
])('does not trust %s with server credentials', value => {
  expect(isTrustedStacksApiUrl(value)).toBe(false);
});

test.each([
  'not a URL',
  'file:///etc/passwd',
  'https://user:password@api.example',
  'https://api.hiro.so?next=https://attacker.example',
  'https://api.hiro.so#fragment',
])('rejects malformed API bases, credentials, queries and fragments: %s', value => {
  expect(getAllowedStakingApiUrl('mainnet', value)).toBeUndefined();
});
