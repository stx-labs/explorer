# Workplan: Deterministic "Why it failed" diagnosis + agent context pack

## Task ID

2829 — https://github.com/stx-labs/explorer/issues/2829

## Problem Statement

Failed contract-call pages show one of two boilerplate sentences chosen by `tx_status`, plus the raw
`vm_error`. In a 1,500-tx mainnet sample this is unhelpful for 56% of failures (explicit `(err uN)`
returns, where `vm_error` is null and the code is not decoded) and **wrong** for post-condition
failures whose result is `(err …)` (every PC failure in the sample): the page says the transaction
"would have succeeded" when the contract itself failed. The API and contract source contain enough
to explain ~95% of failures in plain language with a concrete next step, and to hand an agent a
complete, safe context document — neither is used today.

## Components Involved

- New: `src/common/tx-diagnosis/**` — classify, `vm_error` parser, Clarity source utilities,
  error-code resolver (budgeted, isomorphic via a contract loader), native built-in error table,
  semantic tag dictionary, known-errors registry, copy templates, correlations, context-pack
  renderers, orchestrator, fixtures and tests
- New: `src/app/txid/[txId]/redesign/why-failed/**` — `useTxDiagnosis` hook, `DetailChip` and the
  tiered `WhyItFailed` card (design decided 2026-09-03)
- New: `src/app/txid/[txId]/context.md/route.ts`, `context.json/route.ts`,
  `context/route-shared.ts`; `src/common/tx-diagnosis/server.ts` (server-side loaders)
- Modified: `redesign/ContractCallPage.tsx` (render `WhyItFailed` for failed contract calls instead
  of the boilerplate alert), `redesign/post-conditions/PostConditions*.tsx` (`?highlight=` row
  emphasis), `redesign/source/Source.tsx` + `CodeEditor.tsx` (`?line=` reveal + decoration),
  `TxIdPageContext.tsx` + `page.tsx` (SSR contract fetch for failed contract calls), `layout.tsx`
  (metadata description), `common/components/meta/transactions.tsx` (OG description)
- Deleted: `src/app/txid/[txId]/useWhyDidMyTxFail.ts` (dead hook calling a 503 endpoint)
- Modified: `e2e/page-txid.spec.ts`; new `e2e/failed-transactions-test-vector.ts`
- Docs: `docs/how-to-guides/transaction-failure-diagnosis.md`

## Dependencies

- Hiro API: `/extended/v1/tx/{id}`, `/extended/v1/contract/{id}`,
  `/extended/v2/addresses/{a}/transactions`, `/extended/v1/address/{p}/transactions`,
  `/extended/v1/address/{p}/balances?until_block=` (validated 2026-09-03; `tip=` on `/v2/*` is
  ignored by the public API and is not used)
- `@stacks/transactions` (already a dependency) for `hexToCV` / `Cl`
- Fixture corpus: 489 mainnet failures / 53 distinct combos sampled 2026-08-23 → 09-03; a golden
  subset is committed under `__fixtures__/`, the full set is validated live from a committed txid list
- No new packages; no env vars beyond the existing `EXPLORER_STACKS_API_KEY`

## Implementation Checklist

Engine

- [x] `types.ts` — `Diagnosis`, `FailureClass` (incl. reserved `dropped` / `deploy_failure`), loaders
- [x] `classify.ts` — exact decision table; masked post-condition errors classified as contract errors
- [x] `vm-error.ts` — 7 post-condition formats, `RuntimeError` variants, analysis errors
- [x] `clarity-source.ts` — constants (two definition styles, `(err NAME)` guard), function bodies
      (paren scan), usage sites, in-contract call graph incl. bare-symbol callbacks, static callees,
      comments, line numbers
- [x] `resolve-error-code.ts` — budgeted resolver (≤ 3 callee fetches), dynamic-dispatch candidates
      from every contract principal in `function_args`, native fallback
- [x] `native-errors.ts`, `tags.ts`, `registry/known-errors.json` (seeded, 23 codes)
- [x] `templates.ts` — copy per class / subkind / tag (from the design sprint)
- [x] `correlate.ts` — later successful retry, PC-principal activity, balance at parent block (gated)
- [x] `diagnose.ts` — `diagnoseSync` (Tier 0, no I/O) and `enrich` (Tier 1)
- [x] `context-pack.ts` — Markdown + JSON renderers, playbook, on-chain content delimited as data

**UI**

- [x] `useTxDiagnosis` — memoized Tier 0 from the already-cached contract; callee queries; gated
      correlation queries
- [x] `WhyItFailed` — Tier 0 (headline, sender action, fee invariant, "See details"), Tier 1 (facts
      with links, "For developers", evidence), Tier 2 (agent CTA with link + Copy prompt, failing
      source line, post-condition row, arguments, raw); identifiers as copyable chips
- [x] `ContractCallPage` integration; other tx types / statuses untouched
- [x] Post-conditions row highlight; Source tab `line` reveal + decoration; `?tab=` / `line` deep links
- [x] SSR: `page.tsx` fetches the contract for failed contract calls; `layout.tsx` metadata uses the headline

**Context pack**

- [x] `context.md` / `context.json` route handlers with cache + `X-Robots-Tag: noindex`; 404 for non-failed
- [x] Copy-prompt CTA (only agent CTA in v1)

**Quality**

- [x] Golden fixtures + `labels.json`; live acceptance test over the full corpus (`TX_DIAGNOSIS_LIVE=1`)
- [x] e2e: real failed txids in `e2e/failed-transactions-test-vector.ts`, Tier 0 asserted via
      `data-test` hooks (written; Playwright browsers not installed locally — runs in CI)
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm build`
- [x] Removed the temporary design-sprint route and mock stories
- [x] Docs (`docs/how-to-guides/transaction-failure-diagnosis.md`); CHANGELOG is generated by
      semantic-release from the Conventional Commit
- [ ] PR per `pull_request_template.md`

## Verification Steps

1. `pnpm lint && pnpm test:unit && pnpm build` green.
2. Acceptance on the corpus: 100% correct masked-vs-genuine post-condition classification; ≥ 90% of
   explicit `(err uN)` cases resolve to a named constant; zero cases produce a "would have succeeded"
   headline with an `(err …)` result; every class yields a class-specific headline.
3. Manual review on the preview deployment:
   - `0x22b61b96…d0f1` genuine PC rollback → principal mismatch, `(ok u2895)`, later success `0xbef7…`
   - `0xb7991116…` masked PC → `ERR_MINIMUM_RECEIVED`, no "would have succeeded"
   - a `dlmm-swap-router` `(err u2003)` → slippage copy, source-line link
   - `native-pool-v1.delegate (err u19)` → `ERR_ALREADY_STAKED` found in `pox-5` (callee hop)
   - `bitflow-exec-1.p23 (err u318)` → dynamic-dispatch candidates from args
   - `arkadiko-oracle-v2-3 (err u8403)` → bare-constant definition style
   - `dlmm-liquidity-router-v-1-2.withdraw-liquidity-multi` `ArithmeticUnderflow` → variant copy,
     pools as chips, honest confidence
4. Network panel: no additional requests before Tier 0 paints; ≤ 6 requests after expansion.
5. `curl -i …/context.md` → 200 `text/markdown` with cache + noindex headers; a success tx → 404.
6. JS disabled: Tier 0 present in the SSR HTML of a failed contract-call page.
7. Playwright e2e green.

## Decision Authority

- Scope, hosting (Vercel), single PR, no URL gate, no model / MCP work: Alex — decided.
- Card structure, disclosure tiers, copy: decided in the design sprint (2026-09-03); copy tweaks are
  the implementer's call within those decisions.
- Engine internals, fetch budgets, fixture format: implementer.

## Questions/Uncertainties

**Blocking**

- None.

**Non-blocking**

- Committed contract fixtures (~1 MB) — trim to excerpts if reviewers object.
- Registry ownership for protocol-specific copy after launch.
- Storybook is broken on Next 16 (`@storybook/nextjs` 8.6 requires `next/config`); stories are
  written but cannot run until that is upgraded separately.

## Acceptable Tradeoffs

- Opaque codes without a constant or registry entry get generic copy plus a source link.
- Runtime panics may be `medium` / `low` confidence when several candidate sites exist; no
  re-simulation in this PR.
- No analytics, no deep links beyond Copy prompt, no mempool / dropped or deploy-failure handling
  (types reserve them).
- Correlations are best-effort and render only in the expanded tier.

## Status

In Progress

## Notes

- Events are never retained on failed txs; "what moved" comes from `vm_error` text, arguments and source.
- Masked post-condition errors are 77% of post-condition failures in the corpus; genuine rollbacks are
  8/489 (asset-unchecked 5, amount 2, NFT 1, principal-mismatch 0).
- Route handlers follow the existing `NextRequest` + `Response.json` / `next: { revalidate }` style.
