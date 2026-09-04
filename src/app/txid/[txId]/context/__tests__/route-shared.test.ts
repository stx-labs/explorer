/**
 * @jest-environment node
 */
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { ENGINE_VERSION } from '@/common/tx-diagnosis';
import * as server from '@/common/tx-diagnosis/server';
import type { NextRequest } from 'next/server';

import { handleContextPack } from '../route-shared';

jest.mock('@/common/tx-diagnosis/server', () => ({
  buildContextPack: jest.fn(),
}));
jest.mock('@/common/utils/error-utils', () => ({ logError: jest.fn() }));

const buildContextPack = jest.mocked(server.buildContextPack);

const TX = '0x22b61b960238b6e2a5c9749f61ed3f87084fac2002e8d4cd7b02339b3400d0f1';

function request(path: string, headers: Record<string, string> = {}): NextRequest {
  const url = new URL(`https://explorer.hiro.so${path}`);
  return {
    nextUrl: url,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

describe('context pack route handler', () => {
  beforeEach(() => jest.resetAllMocks());

  it('serves Markdown with caching, ETag and noindex headers', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: { a: 1 } } as never);
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md?chain=mainnet`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(res.headers.get('cache-control')).toContain('s-maxage=31536000');
    expect(res.headers.get('etag')).toBe(`W/"${TX}-mainnet-v${ENGINE_VERSION}-markdown"`);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(await res.text()).toBe('# md');
    expect(buildContextPack).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: TX,
        network: 'mainnet',
        explorerBaseUrl: 'https://explorer.hiro.so',
      })
    );
  });

  it('serves JSON', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: { a: 1 } } as never);
    const res = await handleContextPack(
      request(`/txid/${TX}/context.json`),
      Promise.resolve({ txId: TX }),
      'json'
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(JSON.parse(await res.text())).toEqual({ a: 1 });
  });

  it('answers 304 with the same caching headers when the builder confirms the validator', async () => {
    buildContextPack.mockResolvedValue({ status: 304 });
    const etag = `W/"${TX}-mainnet-v${ENGINE_VERSION}-markdown"`;
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md`, { 'if-none-match': etag }),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(etag);
    expect(res.headers.get('cache-control')).toContain('s-maxage=31536000');
    expect(await res.text()).toBe('');
  });

  it('hands the validator to the builder, which checks the transaction exists first', async () => {
    buildContextPack.mockResolvedValue({ status: 304 });
    const etag = `W/"${TX}-mainnet-v${ENGINE_VERSION}-json"`;
    const res = await handleContextPack(
      request(`/txid/${TX}/context.json?chain=mainnet`, { 'if-none-match': etag }),
      Promise.resolve({ txId: TX }),
      'json'
    );
    expect(res.status).toBe(304);
    expect(buildContextPack).toHaveBeenCalledTimes(1);
    expect(buildContextPack).toHaveBeenCalledWith(
      expect.objectContaining({ etag, ifNoneMatch: etag })
    );
  });

  it('serves the representation when the validator does not match', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: {} } as never);
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md`, { 'if-none-match': 'W/"stale"' }),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(200);
    expect(buildContextPack).toHaveBeenCalledWith(
      expect.objectContaining({ ifNoneMatch: 'W/"stale"' })
    );
  });

  it('does not let a forged validator turn an unknown transaction into a 304', async () => {
    buildContextPack.mockResolvedValue({ status: 404, reason: 'Transaction not found.' });
    const res = await handleContextPack(
      request(`/txid/${TX}/context.json?chain=mainnet`, {
        'if-none-match': `W/"${TX}-mainnet-v${ENGINE_VERSION}-json"`,
      }),
      Promise.resolve({ txId: TX }),
      'json'
    );
    expect(res.status).toBe(404);
    expect(buildContextPack).toHaveBeenCalledTimes(1);
  });

  it('never fetches from a host that is not a configured public API', async () => {
    for (const api of ['https://evil.example', 'http://169.254.169.254/latest', 'not a url']) {
      const res = await handleContextPack(
        request(`/txid/${TX}/context.md?chain=mainnet&api=${encodeURIComponent(api)}`),
        Promise.resolve({ txId: TX }),
        'markdown'
      );
      expect(res.status).toBe(400);
      expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    }
    const other = await handleContextPack(
      request(`/txid/${TX}/context.md?chain=devnet`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(other.status).toBe(400);
    expect(buildContextPack).not.toHaveBeenCalled();
  });

  it('accepts the configured public API when it is named explicitly', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: {} } as never);
    const res = await handleContextPack(
      request(
        `/txid/${TX}/context.md?chain=mainnet&api=${encodeURIComponent(DEFAULT_MAINNET_SERVER + '/')}`
      ),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(200);
    expect(buildContextPack).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: DEFAULT_MAINNET_SERVER.replace(/\/$/, '') })
    );
  });

  it('rejects malformed transaction ids without fetching', async () => {
    for (const bad of ['hello', '0x1234', `${TX}zz`, '../etc/passwd']) {
      const res = await handleContextPack(
        request(`/txid/${bad}/context.md`),
        Promise.resolve({ txId: bad }),
        'markdown'
      );
      expect(res.status).toBe(400);
    }
    expect(buildContextPack).not.toHaveBeenCalled();
  });

  it('returns a short-lived 404 for transactions without a diagnosis', async () => {
    buildContextPack.mockResolvedValue({ status: 404, reason: 'not a failed contract call' });
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(await res.text()).toBe('not a failed contract call');
  });

  it('does not cache transient upstream failures as missing transactions', async () => {
    buildContextPack.mockResolvedValue({
      status: 429,
      reason: 'rate limited',
      retryAfter: '30',
    });
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('retry-after')).toBe('30');
  });

  it.each([
    ['markdown' as const, 'text/plain', 'Unable to build context pack.'],
    ['json' as const, 'application/json', '{"error":"Unable to build context pack."}'],
  ])('returns a controlled 500 for unexpected %s failures', async (format, contentType, body) => {
    buildContextPack.mockRejectedValue(new Error('secret upstream response'));
    const res = await handleContextPack(
      request(`/txid/${TX}/context.${format === 'json' ? 'json' : 'md'}`),
      Promise.resolve({ txId: TX }),
      format
    );

    expect(res.status).toBe(500);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-type')).toContain(contentType);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(await res.text()).toBe(body);
  });
});

describe('context pack route validation', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rejects unexpected query parameters before doing any work', async () => {
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md?chain=mainnet&nocache=1`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(400);
    expect(buildContextPack).not.toHaveBeenCalled();
  });

  it("requires the api parameter to be the selected chain's own server", async () => {
    const res = await handleContextPack(
      request(
        `/txid/${TX}/context.md?chain=mainnet&api=${encodeURIComponent(DEFAULT_TESTNET_SERVER)}`
      ),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(400);
    expect(buildContextPack).not.toHaveBeenCalled();
  });

  it('validates the chain before honouring a validator', async () => {
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md?chain=devnet`, {
        'if-none-match': `W/"${TX}-devnet-v${ENGINE_VERSION}-markdown"`,
      }),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(400);
    expect(buildContextPack).not.toHaveBeenCalled();
  });

  it('keys the validator on the chain and fetches from that chain’s server', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: {} } as never);
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md?chain=testnet`),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe(`W/"${TX}-testnet-v${ENGINE_VERSION}-markdown"`);
    expect(buildContextPack).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: DEFAULT_TESTNET_SERVER.replace(/\/$/, ''),
        network: 'testnet',
      })
    );
  });
});
