# Workplan: Say When Token Decimals Are Unknown

## Task ID
2797

## Problem Statement
On an address page, the fungible tokens table formats each balance with the token's decimals from the
token metadata API. When a token has no metadata (the API returns "Token not found"), the table uses
`decimals || 0`, so it shows the raw base-unit amount as if it were a whole-token balance. For example,
an LP token balance of `221575704960232` base units is shown as `221,575,704,960,232` with nothing to
say the decimals are a guess.

## Components Involved
- `src/common/utils/utils.ts` - new `formatFtBalance` helper
- `src/common/components/table/fungible-tokens-table/FungibleTokensTable.tsx` - Balance column

## Dependencies
None.

## Implementation Checklist
- [x] Add `formatFtBalance(value, decimals)`, which uses known decimals as before
- [x] When decimals are missing, show the exact raw amount with "raw units (decimals unknown)"
- [x] Use it in the fungible tokens table
- [x] Add unit tests

## Verification Steps
1. `pnpm test:unit`
2. `pnpm lint`
3. Open address `SMX6S05DQT3HB1DE3X357C8FH6GHGYHQQ2AZE2YJ`, Tokens tab, and check the LP tokens
   without metadata show `... raw units (decimals unknown)`

## Decision Authority
- Self-directed: the explorer cannot know the real decimals without metadata, so it shows the exact
  on-chain amount and says the decimals are unknown instead of guessing.

## Questions/Uncertainties
### Non-blocking
- Reading decimals from the token contract's `get-decimals` function would give the real value, but
  needs a read-only contract call per token. Left for later.
- `FtTokenAmount` (legacy token balance card) still falls back to 0 while metadata loads; it is not used
  by the current address page.

## Acceptable Tradeoffs
- The balance text is longer for tokens without metadata.

## Status
Completed

## Notes
- Tokens whose metadata says 0 decimals are still shown as whole numbers with no note.
- The raw amount is formatted with BigNumber, so large amounts keep every digit.
