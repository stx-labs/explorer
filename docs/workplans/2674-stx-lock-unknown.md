# Workplan: STX lock events marked as "Unknown"

## Task ID
2674

## Problem Statement
STX lock events in the transaction events table are displaying "Unknown" instead of "STX lock" in the Event column. This affects both historical POX transactions (pox-3) and current POX transactions (pox-f).

Example transactions:
- https://explorer.hiro.so/txid/0x5c86cd39382cc8da8dac239a93545a01757e2d08fa88fbd35f71fd38e1d63fb6?chain=mainnet&tab=events
- https://explorer.hiro.so/txid/0xfd7c99d893d97ecab3aa40976c0464b49b7df372c7f6e9bdacc9fdb5f7b583fb?chain=mainnet&tab=events

## Root Cause
In `src/app/txid/[txId]/redesign/events-table/utils.tsx`, the `getAssetEventType()` function checks for `'stx_lock' in event` (line 86) to identify STX lock events. However, according to the `@stacks/stacks-blockchain-api-types` package, the `TransactionEventStxLock` type has a property called `stx_lock_event` (not `stx_lock`).

Since the property name doesn't match, the condition fails, and the function falls through to return `EMPTY_VALUE` (`'-'`), which then gets rendered as "Unknown" by `getAssetEventTypeLabel()`.

## Components Involved
- `src/app/txid/[txId]/redesign/events-table/utils.tsx`
  - `getAssetEventType()` function

## Dependencies
- `@stacks/stacks-blockchain-api-types` (v7.14.1)

## Implementation Checklist
- [x] Identify the root cause
- [x] Fix `getAssetEventType()` to check for `'stx_lock_event'` instead of `'stx_lock'`
- [x] Run linting checks
- [x] Run unit tests
- [ ] Build the project

## Verification Steps
1. Run `pnpm lint` - ✅ passed (no new errors, 4 pre-existing warnings)
2. Run `pnpm test:unit` - ✅ passed (596 tests, 50 suites)
3. Run `pnpm build` - pending
4. Manually test by navigating to a transaction with STX lock events

## Decision Authority
Independent decision - this is a straightforward bug fix.

## Questions/Uncertainties
None - verified with live API that the property is `stx_lock_event` (not `stx_lock`).

## Acceptable Tradeoffs
None needed.

## Status
In Progress

## Notes
The fix is a simple one-line change: update the property check from `'stx_lock'` to `'stx_lock_event'` in the `getAssetEventType()` function.

