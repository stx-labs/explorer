# Workplan: Deterministic transaction-failure diagnosis

## Task ID

2829 — https://github.com/stx-labs/explorer/issues/2829

## Problem Statement

Failed contract-call pages previously selected one of two boilerplate messages from `tx_status` and
showed the raw `vm_error`. That was unhelpful for explicit `(err uN)` responses and incorrect for
post-condition failures whose contract result was also `(err ...)`: the page said the transaction
would have succeeded even though the contract call had failed.

The transaction, deployed Clarity source, and bounded related API data can instead provide a
deterministic explanation, a concrete sender action, and a safely delimited context pack for agents.
No language model is used by the application.

## Components Involved

- `src/common/tx-diagnosis/`: classification, source analysis, bounded error-code resolution,
  correlation, curated registry, copy, context-pack rendering, fixtures, and tests.
- `src/app/txid/[txId]/redesign/why-failed/`: tiered failure card and React Query enrichment.
- `src/app/txid/[txId]/context.md/` and `context.json/`: cached agent-context routes.
- Transaction source and post-condition tabs: deep-link highlighting.
- `scripts/tx-diagnosis/`: live evaluation and fixture-promotion harness.
- `e2e/failed-transactions-test-vector.ts` and `e2e/page-txid.spec.ts`: browser coverage.

Architecture and extension rules live in
[`src/common/tx-diagnosis/README.md`](../../src/common/tx-diagnosis/README.md). Operator procedures
live in the [transaction-failure diagnosis guide](../how-to-guides/transaction-failure-diagnosis.md).

## Dependencies

- Configured Hiro mainnet/testnet API servers only.
- Existing `@stacks/transactions` and React Query dependencies; no new package or environment
  variable.
- Correlations currently use the generated client's deprecated
  `/extended/v2/addresses/{address}/transactions` response. Migrating to the v3 principals endpoint
  is deferred because its response and correlation semantics differ.

## Implementation Checklist

### Engine and context pack

- [x] Classify contract errors, runtime/analysis errors, genuine post-condition rollbacks, and
      post-condition failures that mask a contract error.
- [x] Parse current stacks-core post-condition and runtime error formats; unknown VM errors remain
      low-confidence unknowns.
- [x] Resolve constants through reachable source and at most three callees; report ambiguity rather
      than selecting duplicate codes.
- [x] Resolve guarded native built-in codes and curated registry entries without overriding source
      evidence.
- [x] Detect fold-accumulator error masking and distinguish same-input retries from later calls with
      different arguments.
- [x] Render Markdown and JSON context packs with on-chain content delimited as untrusted data.
- [x] Restrict server loaders to configured public APIs; validate transaction IDs, chain, API, and
      query parameters before upstream work.
- [x] Return cache/ETag/noindex headers, short-lived negative responses, and controlled no-store
      upstream failures.

### UI

- [x] Replace the failed-contract-call boilerplate with synchronous Tier 0 copy, expandable facts,
      technical details, and one `Copy Prompt for Agent to Explore` action.
- [x] SSR-seed valid called-contract source and share the network-aware contract query/cache with
      callee enrichment.
- [x] Render source, arguments, raw details, and the implicated post-condition with existing table
      and summary primitives.
- [x] Add source-line and post-condition-row deep links and highlights.
- [x] Use the diagnosis headline in transaction metadata and Open Graph descriptions.

### Quality and maintainability

- [x] Commit 54 manually reviewed golden cases plus a 484-ID live acceptance set; document the
      distinct dataset counts in the fixture README.
- [x] Apply the deterministic rubric to every golden case and keep the public-API live suite opt-in.
- [x] Provide evaluation, baseline comparison, and promote-to-fixture commands.
- [x] Organize tests by production responsibility, validate registry schema, and cover scripts with
      TypeScript, ESLint, and Prettier.
- [x] Split the failure card into cohesive modules and reuse contract query and argument-table
      primitives.
- [x] Complete the final lint, unit, typecheck, build, Playwright, route, and visual verification
      pass.
- [x] Remove the dead `useWhyDidMyTxFail` hook and temporary design-sprint page/stories.

## Verification Steps

1. `pnpm lint`, `pnpm test:unit`, `pnpm typecheck`, `pnpm diagnosis:build`, and `pnpm build` pass.
2. Golden/rubric suite: no unexpected diagnosis or copy changes; registry names agree with committed
   source fixtures.
3. Opt-in live suite: all 484 IDs fetch, post-condition classification remains consistent, at least
   90% of explicit uint codes receive a candidate name, and no `(err ...)` result says the call
   would have succeeded.
4. Playwright covers failed contract calls and representative contract, runtime, post-condition,
   masked, and native/callee cases.
5. Desktop/mobile and light/dark review confirms the tiered card, source line, argument table,
   highlighted post-condition, narrow narrative measure, and single copy-prompt action.
6. Context routes return the expected 200/304/400/404/upstream status, content type, cache, ETag, and
   noindex headers; unexpected exceptions are covered through a unit-test seam.
7. Network inspection confirms no extra browser request before Tier 0 and bounded enrichment after
   expansion.

## Decision Authority

- Alex: scope, hosting, single PR, no feature flag, no model/MCP integration.
- Accepted design: disclosure tiers, user-facing copy, technical rows, and single agent action.
- Implementer: engine internals, bounded fetch strategy, and fixture representation within those
  constraints.

## Questions/Uncertainties

### Blocking

- None.

### Non-blocking

- Long-term ownership for protocol-specific registry copy.
- Migration of correlation history from the deprecated v2 address endpoint to v3 principals.
- Storybook remains unavailable until its repo-wide Next 16 incompatibility is addressed.

## Acceptable Tradeoffs

- Opaque or ambiguous codes get honest generic/candidate copy rather than a guessed cause.
- Runtime sites can remain medium/low confidence because failed calls have no execution trace and
  this feature does not re-simulate transactions.
- Correlations are best-effort and gated behind expansion.
- Mempool, dropped, and deployment failures are outside this version.

## Status

Completed

## Notes

- Failed transactions retain no events; asset movement evidence comes from the transaction result,
  `vm_error`, post-conditions, arguments, and source.
- The committed datasets are deliberately different: 54 golden labels, 484 live acceptance IDs,
  and 490 historical observations represented by the current sum of label `count` weights.
- A router fold may replace a failing item's real error with `ERR_NO_RESULT_DATA`; the engine labels
  that code as a placeholder and recommends bisecting or replaying inputs rather than inventing a
  hidden cause.
- Context packs exclude mutable later-history correlations so their long-lived edge cache remains
  valid.
