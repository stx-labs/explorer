import { getAllowedStakingApiUrl, isTrustedStacksApiUrl } from '../server-api-origin';

jest.mock('@/common/constants/env', () => ({
  DEFAULT_MAINNET_SERVER: 'https://api.hiro.so',
  DEFAULT_TESTNET_SERVER: 'https://api.testnet.hiro.so',
}));

const originalPrivateApi = process.env.STAKING_PRIVATE_API_URL;
beforeEach(() => {
  process.env.STAKING_PRIVATE_API_URL = 'https://private-1.example/api';
});
afterEach(() => {
  if (originalPrivateApi === undefined) delete process.env.STAKING_PRIVATE_API_URL;
  else process.env.STAKING_PRIVATE_API_URL = originalPrivateApi;
});

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
  expect(isTrustedStacksApiUrl('https://private-1.example/api/v2/pox')).toBe(false);
  delete process.env.STAKING_PRIVATE_API_URL;
  expect(getAllowedStakingApiUrl('testnet', 'https://private-1.example/api')).toBeUndefined();
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
])('rejects unconfigured destinations and withholds server credentials: %s', value => {
  expect(getAllowedStakingApiUrl('testnet', value)).toBeUndefined();
  expect(isTrustedStacksApiUrl(value)).toBe(false);
});

test.each([
  'https://private-1.example',
  'https://private-1.example/api/other',
  'https://private-1.example.attacker.example/api',
  'not a URL',
  'file:///etc/passwd',
  'https://user:password@api.example',
  'https://api.hiro.so?next=https://attacker.example',
  'https://api.hiro.so#fragment',
])('rejects unmatched or malformed API bases: %s', value => {
  expect(getAllowedStakingApiUrl('mainnet', value)).toBeUndefined();
});
