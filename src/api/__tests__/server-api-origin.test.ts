import { getAllowedStakingApiUrl, isTrustedStacksApiUrl } from '../server-api-origin';

jest.mock('@/common/constants/env', () => ({
  DEFAULT_MAINNET_SERVER: 'https://api.hiro.so',
  DEFAULT_TESTNET_SERVER: 'https://api.testnet.hiro.so',
}));

test('uses configured networks and canonicalizes allowed overrides', () => {
  expect(getAllowedStakingApiUrl('mainnet')).toBe('https://api.hiro.so');
  expect(getAllowedStakingApiUrl('testnet')).toBe('https://api.testnet.hiro.so');
  expect(getAllowedStakingApiUrl('testnet', 'https://API.TESTNET.HIRO.SO:443/')).toBe(
    'https://api.testnet.hiro.so'
  );
  expect(isTrustedStacksApiUrl('https://api.hiro.so/extended/v1/tx?limit=5')).toBe(true);
});

test.each([
  'https://attacker.example',
  'https://api.hiro.so.attacker.example',
  'https://api.hiro.so@attacker.example',
  'https://attacker@api.hiro.so',
  'https://api.hiro.so:8443',
  'http://api.hiro.so',
  'http://127.0.0.1:3999',
  'https://127.0.0.1',
  'https://2130706433',
  'https://0x7f000001',
  'https://localhost',
  'https://10.0.0.1',
  'https://172.16.0.1',
  'https://192.168.0.1',
  'https://169.254.169.254',
  'https://[::1]',
  'https://[::ffff:127.0.0.1]',
  'https://[fe80::1]',
  'https://rebind.attacker.example',
  '//api.hiro.so',
  'file:///etc/passwd',
  'not a URL',
])('rejects untrusted destination %s without resolving or fetching it', value => {
  expect(getAllowedStakingApiUrl('mainnet', value)).toBeUndefined();
  expect(isTrustedStacksApiUrl(value)).toBe(false);
});

test.each([
  'https://api.hiro.so/redirect',
  'https://api.hiro.so?next=https://attacker.example',
  'https://api.hiro.so#fragment',
])('rejects attacker-controlled base paths/query/fragment: %s', value => {
  expect(getAllowedStakingApiUrl('mainnet', value)).toBeUndefined();
});
