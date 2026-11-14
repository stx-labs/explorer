# Workplan: Make Timestamps Say UTC

## Task ID
2850

## Problem Statement
The "Timestamp" field on transaction pages (and the one on token pages) shows a bare time such as
`2026-10-06 14:02:11`. Nothing says which timezone it is in, so readers cannot tell if it is UTC or
their local time. The value is also built from local-time getters, so the server (UTC) and a browser in
another timezone can render different times for the same transaction.

## Components Involved
- `src/common/utils/time-utils.ts` - `formatBlockTime` formats in UTC and appends `(UTC)`
- `src/app/txid/[txId]/redesign/tx-summary/*TxSummary.tsx` - already use `formatBlockTime` (no change)
- `src/app/token/[tokenId]/redesign/TokenIdOverview.tsx` - uses `formatBlockTime` for its timestamp

## Dependencies
None.

## Implementation Checklist
- [x] Make `formatBlockTime` use UTC getters and add a `(UTC)` label
- [x] Use `formatBlockTime` for the token page timestamp
- [x] Add a unit test that runs in a non-UTC timezone

## Verification Steps
1. `pnpm test:unit`
2. `pnpm lint`
3. Open a confirmed transaction page and check the Timestamp field ends with `(UTC)`

## Decision Authority
- Self-directed: the `(UTC)` label matches the one `formatTimestampTo12HourTime` already uses on the
  homepage.

## Questions/Uncertainties
### Non-blocking
- A setting to show local time or a chosen timezone (suggested in the issue) is left for later.
- The short burn block times in the blocks list (`formatTimestamp` default format) are not changed.

## Acceptable Tradeoffs
- The timestamp text is six characters longer.

## Status
Completed

## Notes
- The copy button copies the same labelled string.
