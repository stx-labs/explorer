# Workplan: Fix BNS Collectibles BigInt Conversion Error

## Task ID
2680

## Problem Statement
The Stacks Explorer fails to display collectables for wallets with BNS (.btc) names. When clicking on the Collectibles tab for addresses that hold BNS names, an error occurs:
> "SyntaxError: Cannot convert bradbaker.btc to a BigInt"

The issue is that BNS names are stored as string values (like "bradbaker.btc"), but the code blindly tries to convert any string value to a BigInt, which fails for non-numeric strings.

## Components Involved
- `src/app/address/[principal]/redesign/NFTTable.tsx` - Contains the BigInt conversion logic
- `src/app/address/[principal]/redesign/CollectibleCard.tsx` - Receives the tokenId prop

## Dependencies
None - this is a self-contained bug fix.

## Implementation Checklist
- [x] Update `NFTTable.tsx` to handle non-numeric string values gracefully
- [x] Update `CollectibleCard.tsx` to accept both bigint and string tokenId values
- [x] Verify the fix by testing with the address from the issue

## Verification Steps
1. Navigate to address SP3EW5GY6DM9ZT6T20F58PRJNG64VETHKHJF24A9D
2. Click on the Collectibles tab
3. Verify no error occurs and BNS names are displayed

## Decision Authority
- User-led: None required
- Self-directed: Safe to proceed with the fix as it's a clear bug

## Questions/Uncertainties
### Non-blocking
- What's the best way to display BNS names on gamma.io links (may not be a concern if gamma supports string IDs)

## Acceptable Tradeoffs
- The tokenId type becomes a union of `bigint | string` which is slightly less type-safe but accurately represents the API response

## Status
Completed

## Notes
- BNS names are NFTs where the token value is the name string itself, not a numeric ID
- The `cvToJSON` function returns the actual Clarity value, which for BNS is the name string

