# Workplan: Label Incoming Transfers "Receive"

## Task ID
2654

## Problem Statement
On an address page, the transactions table titles every STX transfer "Send X STX", even when the
address is the recipient. The table already knows the transfer is incoming (it shows a down-arrow icon),
so the title should say "Receive X STX" in that case.

## Components Involved
- `src/common/utils/transactions.tsx` - `getTxTitle` takes an optional `principal`
- `src/common/components/table/table-examples/AddressTxsTaBleCellRenderers.tsx` - passes the address

## Dependencies
None.

## Implementation Checklist
- [x] Add an optional `principal` argument to `getTxTitle`
- [x] Return "Receive X STX" when the transfer's recipient is that principal
- [x] Pass the principal from the address transactions table
- [x] Add unit tests

## Verification Steps
1. `pnpm test:unit`
2. `pnpm lint`
3. Open an address that has received STX and check the transfer is titled "Receive X STX"

## Decision Authority
- Self-directed: uses the same recipient check as the existing incoming-arrow icon.

## Questions/Uncertainties
### Non-blocking
- Tables that are not tied to one address (home page, transactions page, mempool) keep "Send".

## Acceptable Tradeoffs
- None.

## Status
Completed

## Notes
- The genesis transfer title is unchanged.
