# WATCHLIST-001 — Watchlist (saved addresses)

## Task ID

WATCHLIST-001

## Problem Statement

Users need a client-side watchlist to save Stacks principals, view aggregated STX balances and USD (via spot price), browse merged recent transactions, and get lightweight notifications for new activity.

## Components Involved

- `src/features/watchlist/*` — Redux slice, storage, hooks, notifier, unified tx mapping
- `src/app/watchlist/*` — Page UI
- `src/common/queries/useWatchlistQueries.ts` — Parallel React Query requests per address
- Address header star control, global nav link + badge, `PageWrapper` notifier mount

## Dependencies

- Existing Hiro API client routes (`/extended/v1/address/.../balances`, `/extended/v2/addresses/.../transactions`)
- Redux store, React Query, `react-hot-toast`, Chakra UI components

## Implementation Checklist

- [x] `useWatchlist` + localStorage persistence (`stacks-explorer-watchlist`)
- [x] Star button on address page + lifecycle (viewed / BNS sync)
- [x] `/watchlist` page: portfolio header, distribution, table/cards, filters, unified tx list
- [x] Nav link with new-tx badge; optional toasts (toggle + `stacks-explorer-watchlist-notifications-disabled`)
- [x] Unit tests: storage, validation, portfolio utils, hook smoke tests

## Verification Steps

1. `pnpm exec jest src/features/watchlist/__tests__`
2. Manual: add address from `/address/...`, open `/watchlist`, verify balances and txs; remove with confirm dialog; toggle notifications.
3. `pnpm lint` / `pnpm typecheck` as per repo health (known unrelated TS issues may exist in other files).

## Status

Completed

## Notes

- True multi-address “single HTTP batch” for balances is not provided by the public API; the implementation uses one React Query request per principal (`useQueries`) with aligned refetch interval (~60s).
- USD column reflects STX holdings × spot price from `GlobalContext`; fungible-token USD is not priced per-asset in this iteration.
