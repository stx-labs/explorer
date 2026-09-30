/**
 * @jest-environment node
 */
import { getApiUrl } from '@/common/utils/network-utils';

import { stacksAPIFetch } from '../stacksAPIFetch';

describe('stacksAPIFetch', () => {
  const realFetch = global.fetch;
  let calls: { url: string; headers: Headers }[] = [];

  beforeEach(() => {
    calls = [];
    process.env.EXPLORER_STACKS_API_KEY = 'test-key';
    global.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers) });
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.EXPLORER_STACKS_API_KEY;
  });

  it('sends the API key to the configured public servers', async () => {
    await stacksAPIFetch(`${getApiUrl('mainnet')}/extended/v1/tx/0xabc`);
    await stacksAPIFetch(`${getApiUrl('testnet')}/extended/v1/tx/0xabc`);
    expect(calls.map(c => c.headers.get('x-api-key'))).toEqual(['test-key', 'test-key']);
  });

  it('never sends the API key to any other host', async () => {
    for (const url of [
      'https://evil.example/extended/v1/tx/0xabc',
      'http://127.0.0.1:4010/extended/v1/tx/0xabc',
      'http://169.254.169.254/latest/meta-data',
      'https://api.hiro.so.evil.example/extended/v1/tx/0xabc',
    ]) {
      calls = [];
      await stacksAPIFetch(url);
      expect(calls).toHaveLength(1);
      expect(calls[0].headers.get('x-api-key')).toBeNull();
    }
  });
});
