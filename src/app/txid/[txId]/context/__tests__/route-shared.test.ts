/**
 * @jest-environment node
 */
import * as server from '@/common/tx-diagnosis/server';
import { ENGINE_VERSION } from '@/common/tx-diagnosis/types';
import type { NextRequest } from 'next/server';

import { handleContextPack } from '../route-shared';

jest.mock('@/common/tx-diagnosis/server', () => ({
  buildContextPack: jest.fn(),
}));

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
    expect(res.headers.get('etag')).toBe(`W/"${TX}-v${ENGINE_VERSION}-markdown"`);
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

  it('answers 304 with the same caching headers when the ETag matches', async () => {
    buildContextPack.mockResolvedValue({ status: 200, markdown: '# md', json: {} } as never);
    const res = await handleContextPack(
      request(`/txid/${TX}/context.md`, {
        'if-none-match': `W/"${TX}-v${ENGINE_VERSION}-markdown"`,
      }),
      Promise.resolve({ txId: TX }),
      'markdown'
    );
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(`W/"${TX}-v${ENGINE_VERSION}-markdown"`);
    expect(res.headers.get('cache-control')).toContain('s-maxage=31536000');
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
});
