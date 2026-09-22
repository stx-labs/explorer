# PR 2841 review fixes

- Task ID: 2841
- Problem Statement: Address the staking table and cycle overview review comments, including misleading rewards/statuses, pagination, cycle boundaries, accessibility, and consistency.
- Components Involved: BondsTable, BondStateBadge, AnnotatedValue, cycleColumns, StackingOverview, StakingActivity, row transforms, formatting helpers, and regression tests.
- Dependencies: Existing staking data types, Chakra semantic tokens, shared Table pagination, Jest.
- Decision Authority: Implement review fixes within the existing PR scope and design system. Do not publish review replies or resolve threads without an explicit request.
- Questions/Uncertainties: No blocking questions. Unknown future bond statuses should retain their label and use a neutral dot. Cycle-end dates/prices must use the last block, while annualization keeps the full cycle length.
- Acceptable Tradeoffs: Reuse existing semantic colors. Preserve fixed sBTC decimals for ordinary values and use the existing BTC precision fallback for small rewards.
- Status: Completed

## Implementation Checklist

- [x] Fix lifecycle tones and reward precision.
- [x] Extract server-safe row transforms and correct cycle end timestamps.
- [x] Make bond pagination own its page size and full row count.
- [x] Fix tooltip trigger accessibility and unavailable labels.
- [x] Apply locale, semantic color, heading, and incomplete-prop feedback.
- [x] Memoize only the latest displayed cycle rows.
- [x] Finish verification (regression coverage added).

## Verification Steps

- Run targeted staking tests, including pagination and tooltip accessibility regressions.
- Run pnpm lint, pnpm test:unit, pnpm typecheck, and pnpm build.
- Inspect the final diff against all 15 review comments (14 distinct requests).

## Notes

- The worktree started at b911275a5845b40780c00b1be359cdd9c0ff4313, matching the PR head.
- Leave the pre-existing untracked docs/workplans/2827-part-3-staking-tables.md untouched.
- No staking routes exist in this PR, so updated component interfaces have no production callers here.


## Review triage

All 15 comments are actionable; the two status-tone comments describe the same issue.

| Review comments | Resolution |
| --- | --- |
| [4009632518](https://github.com/stx-labs/explorer/pull/2841#discussion_r4009632518), [4065131372](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131372) | Map bond status to its tone, with a neutral fallback for unknown states. |
| [4065131368](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131368) | Use the existing BTC small-value safeguard when requested sBTC precision would hide a reward. Applies to history and all overview reward displays. |
| [4065131376](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131376) | Wrap annotation and projection help icons in labeled, focusable buttons using the shared table pattern. |
| [4065131383](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131383) | Replace bond limit/external pagination props with pageSize and internally managed pagination over all supplied bonds. |
| [4065131388](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131388) | Move row types and transforms into bond-transforms.ts and cycle-transforms.ts, without a client directive. |
| [4065131395](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131395) | Explicit en-US numeric formatting in bond, cycle, and overview displays. |
| [4065131403](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131403) | Use N/A for missing table values. |
| [4065131410](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131410) | Use the final cycle block for end height, date, settlement threshold, and historical prices. Preserve inclusive cycle length for APY. |
| [4065131415](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131415) | Default missing signer count to zero. |
| [4065131422](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131422) | Rename the partial-activity flag to incomplete. |
| [4065131429](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131429) | Use existing surfaceFifth/iconSecondary semantic tokens for activity icons; retain distinct glyphs without introducing new color tokens. |
| [4065131436](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131436) | Render STX-only staking and bond activity as h2, and previous cycles as h3. |
| [4065131448](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131448) | Use textInteractiveHover, which provides stacks-600 in light mode and stacks-400 in dark mode. |
| [4065131458](https://github.com/stx-labs/explorer/pull/2841#discussion_r4065131458) | Sort and limit past cycles before transformation inside useMemo; reuse the first row for the previous-cycle card. |

## Verification results

- Full unit suite: 79 suites passed, 910 tests passed, 2 skipped, 5 snapshots passed.
- Regressions cover small rewards, lifecycle tones, cycle-end date/prices and settlement, signer fallback, keyboard-accessible tooltip, and paging through every bond including a short final page and data refresh.
- Initial interaction test needed asynchronous assertions for the shared Table update. It now passes.
- Initial typecheck caught one stale empty-state icon reference after the icon map simplification; corrected before final verification.
- pnpm lint: passed, with six pre-existing hook-dependency warnings outside staking.
- pnpm typecheck: passed.
- pnpm build: passed, including TypeScript and page generation.
- git diff --check: passed.
- Changes remain local and uncommitted. No GitHub replies were posted and no review threads were resolved.
