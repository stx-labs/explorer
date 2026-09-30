# 2831 — Scope the server-side Stacks API key to the configured API servers

**Task ID:** 2831 — https://github.com/stx-labs/explorer/issues/2831
**Status:** Completed

## Problem Statement

`src/api/stacksAPIFetch.ts` set `x-api-key` from `EXPLORER_STACKS_API_KEY` on every server-side
request, and server components build their API URL from the visitor-supplied `api` query parameter
(`getApiUrl(chain, api)`). A request such as `/txid/<id>?api=https://host.example` therefore made the
explorer's server call that host with the key attached. Found by the independent reviews of #2830;
split out so the change is reviewed on its own.

## Components Involved

- `src/api/stacksAPIFetch.ts` — attaches the key only when `isConfiguredApiUrl(url)`
- `src/common/utils/network-utils.ts` — `isConfiguredApiUrl`, `canServerFetch`
- `src/app/txid/[txId]/page.tsx` — no server-side fetch when `api` names a non-configured host
  (client render, as `ssr=false` already does)
- `src/api/__tests__/stacksAPIFetch.test.ts`, `src/common/utils/__tests__/network-utils-origins.test.ts`
- `docs/getting-started.md` — documents `EXPLORER_STACKS_API_KEY`

## Dependencies

None. #2830 carries the same change; it drops out of that diff once this merges.

## Implementation Checklist

- [x] Key attached only to URLs whose origin and path prefix match `NEXT_PUBLIC_MAINNET_API_SERVER`
      or `NEXT_PUBLIC_TESTNET_API_SERVER` — the same constants the fetchers build URLs from
- [x] Transaction page skips SSR fetching for any other `api` host
- [x] Tests: key sent to both configured servers (trailing slash, path prefix); never to other hosts,
      including a look-alike domain and a link-local address; `canServerFetch` false for custom hosts
- [x] `docs/getting-started.md` documents the variable and where it is sent

## Verification Steps

1. `pnpm lint`, `pnpm test:unit`, `pnpm build` green.
2. Locally, with a request-logging server as `?api=`: the transaction page no longer contacts it;
   mainnet and testnet pages behave as before.
3. After deploy: no rise in upstream `429`s in the function logs — a wrong match would strip the key
   from every server request and push the site onto the public rate limit.

## Decision Authority

- Scope (wrapper plus the transaction page only): Alex.

## Questions/Uncertainties

**Blocking:** none.

**Non-blocking:** whether to gate the remaining server components (`blocks`, `address`, `mempool`,
`transactions`, `stx`, `token`, home) the same way. They still fetch a custom `api` host during SSR,
now without the key.

## Acceptable Tradeoffs

- Custom-network visitors get a client-rendered transaction page, identical to `ssr=false`.

## Notes

- The first draft compared whole URLs and never attached the key. The tests derive the expected URLs
  from the same env constants as production, so that cannot recur unnoticed.
