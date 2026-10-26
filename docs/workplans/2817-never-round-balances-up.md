# Workplan: Never Round Token Balances Up

## Task ID
2817

## Problem Statement
The address page shows token balances rounded to 6 decimals with `toLocaleString`, which rounds half up.
An address holding 189,672 sats of sBTC (0.00189672 sBTC) is shown as 0.001897 sBTC, which is more than it
holds. Developers who copy that amount into a contract call get an insufficient-balance error.

## Components Involved
- `src/common/utils/utils.ts` - new `formatTokenBalance` helper; `ftDecimals` uses it
- `src/app/address/[principal]/redesign/AddressOverview.tsx` - balance card and stacking card amounts

## Dependencies
None.

## Implementation Checklist
- [x] Add `formatTokenBalance`, which uses BigNumber and rounds extra digits down
- [x] Show sBTC and BTC amounts with their full 8 decimals and STX with its 6 decimals
- [x] Make `ftDecimals` format the exact base-unit amount instead of going through a JS number
- [x] Add unit tests

## Verification Steps
1. `pnpm test:unit`
2. `pnpm lint`
3. Open an address that holds 0.00189672 sBTC and check the balance card shows `0.00189672 sBTC`

## Decision Authority
- Self-directed: the issue asks for full precision or rounding down; this does both.

## Questions/Uncertainties
### Non-blocking
- The copy button still copies the JS number string; it was left unchanged.

## Acceptable Tradeoffs
- sBTC balances can show up to 8 decimals instead of 6, which takes slightly more space.

## Status
Completed

## Notes
- `ftDecimals` already showed full precision for most tokens, but converting to a JS number could round
  tokens with many decimals up (for example `999999999999999999` with 18 decimals showed as `1`).
