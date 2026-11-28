
# Workplan: Fix stacksToMicro Floating-Point Rounding

## Task ID
2848

## Problem Statement
`stacksToMicro` converted with `Math.floor(Number(amount) * 1_000_000)`. For about 1.2% of
6-decimal STX amounts the product lands just below the integer and the floor drops a microstack:
`stacksToMicro('0.000249')` returned `248`. The sandbox STX transfer form passes the typed amount
through it, so those transfers sent 1 µSTX less than entered.

## Components Involved
- `src/common/utils/utils.ts` - `stacksToMicro`
- `src/common/utils/__tests__/utils.test.tsx` - its tests
- `src/app/sandbox/transfer/PageClient.tsx` - the caller (unchanged)

## Dependencies
None - `bignumber.js` is already imported in `utils.ts`.

## Implementation Checklist
- [x] Convert with `BigNumber(...).shiftedBy(6)`, keeping the floor for digits past 6 decimals
- [x] Add tests for amounts the old version got wrong and for truncation past 6 decimals

## Verification Steps
1. `pnpm test:unit` - the new cases fail on the old implementation and pass on the new one
2. Brute force over every µSTX step from 0 to 10 STX - no mismatches
3. `pnpm lint` and `pnpm build`

## Decision Authority
- Self-directed: a contained bug fix that keeps the function's signature and floor behavior

## Questions/Uncertainties
### Non-blocking
- The transfer form's balance check compares the API's microstack balance with the STX amount;
  left for a separate change

## Acceptable Tradeoffs
- None; the return type and truncation semantics are unchanged

## Status
Completed

## Notes
- Brute force of the old implementation over 0-1000 STX found 11,829,790 of 1,000,000,001
  amounts converted 1 µSTX short.
