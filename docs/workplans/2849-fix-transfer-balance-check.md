
# Workplan: Fix Sandbox Transfer Balance Check Units

## Task ID
2849

## Problem Statement
The sandbox STX transfer form's validation compared `balance.stx.balance`, which the API reports
in microstacks, with the typed amount in STX:
`Number(balance?.stx?.balance || '0') < (values.amount || 0)`. A 5 STX balance is 5,000,000, so
the "Sorry, you don't have enough STX" error never appeared, even for a 10 STX transfer.

## Components Involved
- `src/app/sandbox/transfer/PageClient.tsx` - the form validation
- `src/app/sandbox/transfer/utils.ts` - new `exceedsStxBalance` helper
- `src/app/sandbox/transfer/__tests__/utils.test.ts` - its tests

## Dependencies
None - `bignumber.js` is already a dependency; the helper follows the faucet page's
`utils.ts` + `__tests__` layout.

## Implementation Checklist
- [x] Compare the amount and the balance in microstacks, using BigNumber
- [x] Use the helper in the form validation
- [x] Add tests for over, at and under the balance, and for missing values
- [x] Floor to whole microstacks before comparing, so validation matches the amount `stacksToMicro`
      sends (review: `5.0000001` STX against a 5 STX balance was rejected but sends 5,000,000 µSTX)

## Verification Steps
1. `pnpm test:unit` - the new helper tests pass
2. The old condition returns `false` for a 10 STX transfer from a 5 STX balance; the helper returns `true`
3. `pnpm lint`, `pnpm typecheck` and `pnpm build`

## Decision Authority
- Self-directed: a contained bug fix that keeps the existing error message and validation flow

## Questions/Uncertainties
### Non-blocking
- The check does not include the fee; "Send max" already subtracts it. Kept to the units fix.

## Acceptable Tradeoffs
- None

## Status
Completed

## Notes
- Follow-up to #2848, which fixed `stacksToMicro` rounding in the same form. This change does not
  depend on it.
