/** @jest-environment node */
import { stacksAPIFetch } from '../stacksAPIFetch';

jest.mock('@/common/constants/env', () => ({
  DEFAULT_MAINNET_SERVER: 'https://api.hiro.so',
  DEFAULT_TESTNET_SERVER: 'https://api.testnet.hiro.so',
}));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

const originalKey = process.env.EXPLORER_STACKS_API_KEY;
const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  process.env.EXPLORER_STACKS_API_KEY = 'fake-test-key';
  global.fetch = fetchMock;
  fetchMock.mockReset().mockResolvedValue(new Response('{}'));
});
afterEach(() => {
  if (originalKey === undefined) delete process.env.EXPLORER_STACKS_API_KEY;
  else process.env.EXPLORER_STACKS_API_KEY = originalKey;
  global.fetch = originalFetch;
});

test.each(['https://api.hiro.so/v2/pox', 'https://api.testnet.hiro.so/v2/pox'])(
  'sends configured credentials only to trusted HTTPS origin %s',
  async url => {
    await stacksAPIFetch(url, { cache: 'no-store', redirect: 'follow' });
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers.get('x-api-key')).toBe('fake-test-key');
    expect(options.cache).toBe('no-store');
    expect(options.redirect).toBe('error');
  }
);

test.each([
  'https://custom.example/v2/pox',
  'https://api.hiro.so.attacker.example/v2/pox',
  'http://api.hiro.so/v2/pox',
])('strips the secret header for non-trusted destinations: %s', async url => {
  const headers = { 'X-Api-Key': 'fake-test-key', Accept: 'application/json' };
  await stacksAPIFetch(url, { headers });
  const options = fetchMock.mock.calls[0][1];
  expect(options.headers.has('x-api-key')).toBe(false);
  expect(options.headers.get('accept')).toBe('application/json');
  expect(headers['X-Api-Key']).toBe('fake-test-key');
  expect(options.redirect).toBeUndefined();
});
