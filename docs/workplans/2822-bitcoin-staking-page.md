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

## Consistency and responsive pass (2 Sep 2026)

Review feedback on the first iteration: the page did not use the same
components as the rest of the Explorer for things like tables, and it broke on
mobile. Checked against the redesign pages (blocks, transactions, STX token).

### Findings
- Every other redesign table renders inside `TableContainer` (bordered card)
  with `ScrollIndicator` for horizontal overflow. The staking tables rendered
  bare, which is also why they were clipped on phones: the page wrapper is
  `overflow: hidden`, so a 750px table at 375px simply lost its right-hand
  columns with no way to reach them.
- To make bare tables look right, `Table` and `TablePaginationControls` had
  gained `bordered`/`showGoToPage` escape hatches and a `getRowHref` row-click
  prop. Wrapping the tables properly removes the need for all three.
- The headline stats used a wrapping flex with `height: 100%` children, which
  resolved to a runaway height on phones (the first stat card was ~1000px tall).
- Custom "view all" / back links, a hand-rolled segmented toggle, and Chakra's
  default `Badge` duplicated `ButtonLink`, `Tabs` (`variant="primary"
  size="redesignMd"`) and the explorer `Badge` recipe.

### Checklist
- [x] Restore `src/common/components/table/Table.tsx` and
      `TablePaginationControls.tsx` to `main` (no shared-component changes)
- [x] Wrap bonds, cycles and activity tables in `TableContainer` +
      `ScrollIndicator`; full pages reserve `minH="500px"` like other list pages
- [x] Replace `ViewAllLink`/`BackLink` with `ButtonLink` (forward/backward);
      "view all" sits top-right on desktop and under the table on phones, as
      on the home page
- [x] Replace the Timeline/Table toggle and the activity filter chips with
      `TabsRoot`/`TabsLabel`/`TabsList`/`TabsTrigger` as on the blocks page
- [x] Bond status via the explorer `Badge` recipe (`BondStateBadge`); failed
      transactions via the shared `StatusTag`
- [x] Activity cells use the shared `TxLinkCellRenderer`, `BlockHeightBadge`
      and `TimeStampCellRenderer`; the event title is the row's link, as the
      title cell is in the transactions table
- [x] Headline stats as one card per figure, reusing `OverviewCard` from the
      transactions overview (extended with an optional `caption` line); two by
      two on phones, one row above. The protocol constants and the call to
      action run as a slim strip beneath, so no card has to match another's
      height (chosen by Fab from three live alternatives, 2 Sep 2026)
- [x] Timeline plot scrolls inside `ScrollIndicator` on narrow screens
- [x] Sub-pages share `SubpageHeader` (back `ButtonLink` + `heading-md`),
      matching the heading size of the other list pages
- [x] Section rhythm copied from the home page: `gap={{ base: 16, md: 18, lg: 20, xl: 24 }}`
      between sections, `gap={4}` from a heading to its content. Bond activity
      promoted to a `heading-md` section so every top-level block reads alike
- [x] The home Stacking card's `ProgressBar` moved to
      `src/common/components/ProgressBar.tsx` and reused for the current cycle
      and the bond term; the cycle block also takes the home card's date chips
      and `BlockHeightBadge` block markers

- [x] Timeline hover reworked to one card: rests on the today line, follows the
      pointer (200ms ease), morphs into the bond details over a bar with a 120ms
      grace on leaving, and flips above the pointer when there is no room below.
      Styled with the network overview chart's tooltip surface, now shared as
      `ChartTooltipSurface` with a backdrop blur

- [x] Timeline plot split into `TimelinePlot.tsx` (rows, hover card, pointer
      state); the chain-wide distribution grid is `getDistributionGridCells` in
      `projections.ts`, unit-tested like the rest of the derived math

### Kept on purpose
- The Gantt-style period timeline, the bond lifecycle list and the dark bond
  tooltip have no closer match in the Explorer; they keep their own markup but
  now sit inside the shared scroll/link/badge primitives.
- The informative empty states (`NoBondsYet`, `NoActivity`) use the `Table`
  component's `emptyTableUi` slot rather than the generic "No results found".
