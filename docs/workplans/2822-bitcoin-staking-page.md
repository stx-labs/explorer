# Workplan: Bitcoin Staking page (`/staking`)

## Task ID
2822

## Problem Statement
The Explorer has no surface for Bitcoin Staking (pox-5 bonds). Per the "Bond Truth"
doc, we need the formative bond numbers (status, capacity, target yield, term, fill,
payouts) plus high-level Stacking data, so users don't have to leave the Explorer for
basic bond and Stacking figures.

Scope confirmed with Mitchell: the doc's data-point list minus the greyed items.

## Components Involved
- `src/app/staking/` (new route)
  - `data.ts` — server-side fetching + UI types
  - `projections.ts` — pure derived math (dates, distribution schedule, fill)
  - `page.tsx` / `PageClient.tsx`
  - components for headline stats, bond table, Stacking cycle
- `src/app/_components/NewNavBar/consts.ts` — enable the stubbed nav entry
- Reuse: `src/app/signers/utils.ts` (`dedupeStakers`, `computeStakerCounts`)

## Data Sources
| Data | Source | Notes |
| --- | --- | --- |
| Bonds list / detail | `/extended/v3/staking/bonds[/:index]` | mainnet currently returns 0 bonds; testnet has 4 |
| Bond registrations | `/extended/v3/staking/bonds/:index/registrations` | staker, signer, type, balances |
| Current stacker count | `/extended/v3/staking/signers` + `/signers/:manager/stakers` | current state only, no cycle scoping |
| PoX params | `/v2/pox` | `reward_cycle_length`, `first_burnchain_block_height` |
| Cycle history | `/extended/v2/pox/cycles` | `total_stacked_amount`, `total_signers` |
| STX / BTC price | `getTokenPriceInfo` (already global) | for USD values |

## Derived Values (all in `projections.ts`)
- Block height -> date: 10 min/block, matching existing `NUM_TEN_MINUTES_IN_DAY` usage
  in `src/app/data.ts`. Rendered as approximate (`~`) like `StackingSection`.
- Distribution schedule: global grid, NOT per-bond. From `pox-5.clar`:
  `distribution_height(n) = first_burnchain_block_height + n * (reward_cycle_length / 2)`
  Do NOT hardcode 1050 — mainnet `reward_cycle_length` is 2100, testnet is 900.
- Target payout per distribution: `(total_sats * target_rate_bps / 10000) / 50`
  (matches `pox-5.clar` `target-yield`).
- Bond fill: `balances.locked.btc / parameters.btc_capacity`.

## Implementation Checklist
- [x] `projections.ts` with unit tests (pure functions, no network)
- [x] `data.ts` fetchers + UI types
- [x] Bond table (index, status, term, capacity + fill, bonded, target rate, paid out)
- [x] Headline stat row (bonded, locked, paid out, target rate, pairing rate, next distribution)
- [x] Stacking section (current cycle, previous cycles, current stacker count)
- [x] Empty / upcoming / active states
- [x] Enable `/staking` nav entry
- [x] Periods overview timeline (per Fab's prototype)
- [x] Bond table aligned to prototype: projected dates under the term, APY
      column naming, payouts labelled sBTC
- [x] Per-cycle BTC rewards and gross APY
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm build`

## Deferred (agreed, not oversight)
| Item | Reason |
| --- | --- |
| Enrollment countdown / CTA | Enrollment open + cutoff heights are not in the API `schedule` |
| Who's participating | Data exists, but shareability is an open decision (per doc) |
| Signer uptime / fees | Not indexed anywhere |
| Growth over time | No time series; meaningless at 0-1 bonds |
| Activity feed | Buildable (`/extended/v2/addresses/<pox-5>/transactions`); cut for size |
| Historical stacker count | See below |

## Questions / Uncertainties

### Non-blocking
- Bond display names: using `Bond {index}`. If marketing names land, add a map like
  `SIGNER_KEY_MAP` in `src/app/signers/consts.ts`.
- "Periods overview" is built, from Fab's prototype at
  https://fab-stacks.github.io/bitcoin-staking-app-design/prototype/bonds/
  It is a Gantt chart: a month axis, one bar per bond spanning its term, and a
  dashed "today" line. The prototype colours bars by whether the bond is yours;
  the Explorer has no connected wallet, so bars are coloured by state instead
  (active / complete / not started yet).
- Unknown what `status` a bond reports after unlock. Only `upcoming` and `active`
  observed on testnet, so `getBondTimelineState` works the completed state out
  from block heights rather than trusting the status field.
- Fab's prototype says bond parameters are set "~7 days before start", but
  Mitchell said 2-4 weeks. Worth reconciling, since it sets how long a bond sits
  in the sparse upcoming state.
- The prototype's "Upcoming Bonds" hero cards (with "Your seat" and an Enroll
  button) are wallet-specific and were not ported.

### Resolved
- **Stacking rewards and APY are available after all**, contrary to the earlier note
  that there was no first-party source. The pox-5 contract applies the reward
  waterfall itself (bonds paid first, then a 15% reserve cut, then STX stackers) and
  stores the result per cycle. Two read-only calls per cycle:
  `get-rewards-per-token-for-cycle(cycle, none)` and
  `get-total-shares-staked-for-cycle(cycle, none)`. No event scanning needed.
  Verified against a live `calculate-rewards` event (tx `0xfeedce2f...`): the
  read-only call returns 350,915,540,939, matching the event exactly.
  Only annualise finished cycles; a running cycle holds a partial figure.
- Cycles before pox-5 (< 141, per `contract_versions`) return 0 from these functions.
  Rendered as an em-dash, not 0%, so it does not read as "nobody earned anything".
- Distribution schedule is a global grid anchored to `first_burnchain_block_height`,
  not to bond activation. Confirmed by reading `pox-5.clar`
  (`distribution-cycle-to-burn-height`). Verified: mainnet next distribution height
  964250 equals the cycle-142 `reward_phase_start_block_height` from `/v2/pox`.
- Bond `btc_capacity` IS on-chain, contrary to the doc's assumption that capacity is
  off-chain Endowment-only.

## Acceptable Tradeoffs
- **Stacker count is current-only, not historical.** `pooled_stacker_count` from
  `/extended/v2/pox/cycles/:c/signers` is accurate for pox-4 cycles (<=140) but reads
  ~0 from cycle 141 on. The v3 staking API has the real number (2,116 at time of
  writing) but accepts no cycle parameter, so past pox-5 cycles are unrecoverable
  once they roll over. Showing current only, omitted from the previous-cycles table.
- The large drop (Xverse: 7,910 pooled in cycle 140 vs 1,644 under pox-5) appears to
  be migration lag, not a data error. Another reason not to chart it across cycles.
- Mainnet has no bonds yet, so empty/upcoming states are primary, not edge cases.
  Testnet is the only source of real fixture data.

## Status
In Progress (MVP scaffold complete, pending Fab's design review)

## Notes
- Verified against both networks with the dev server:
  - testnet (4 bonds): next distribution rendered `#9,900`, matching an independent
    calculation from testnet's 450-block cadence. Confirms the cadence is read from
    `/v2/pox` rather than assuming mainnet's 1050.
  - mainnet (0 bonds): empty state renders; next distribution `#964,250`; current
    cycle 141; stackers 2,116.
- `fetchCurrentStakerCount` returns `undefined` rather than a partial sum when any
  manager request fails. An earlier version treated a failed request as 0 and
  rendered 807 instead of 2,116 — a wrong number reads as authoritative, so the
  stat shows nothing instead.
- Numbers service (doc Part 2) is NOT a dependency for this page. All derived math is
  isolated in `projections.ts` behind a single `PROJECTION_METHOD` constant so it can
  be swapped for a service call without touching UI.
