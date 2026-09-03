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
- [x] `resolve-error-code.ts` — budgeted resolver (≤ 3 callee fetches), dynamic-dispatch targets
      proven by reachable call sites with trait bindings propagated through helpers, native fallback
- [x] `native-errors.ts`, `tags.ts`, `registry/known-errors.json` (seeded, 23 codes)
- [x] `templates.ts` — copy per class / subkind / tag (from the design sprint)
- [x] `correlate.ts` — later successful retry, PC-principal activity, balance at parent block (gated)
- [x] Post-review refinements from auditing agent output on three real failures (2026-09-03):
      fold-accumulator masking detection, argument-aware retry matching, evaluation-order and
      multi-site facts, `taken` tag, allow-mode evidence, registry fixes (`err-oracle-no-fallback`
      both branches, dlmm masking copy, BNS-V2 `u118` / `u125`), richer context pack (full function
      text, list-argument counts, read-only functions, playbook steps) — engine v2
- [x] Post-audit fixes (2026-09-03, independent review of `4ce12268`): context-pack routes only fetch
      the configured public API servers and validate txids, `If-None-Match` is answered before any
      upstream work; duplicate error constants resolve by reachability or are reported as ambiguous
      (callee search restricted to the functions the call can enter; trait arguments mapped by
      position); registry entries corrected (`u2004` removed, PoX `u30`, Bitflow `e07`) and checked
      against fixture sources, dropped when they disagree with the source; SIP-040 stacking formats
      parsed; unrecognised `vm_error` → `unknown_vm_error` at low confidence; post-condition rows
      matched by amount, ambiguous rows listed instead of guessed; Markdown escaping and on-chain
      comments kept out of the diagnosis section; editor line offset for trimmed sources; callee
      lines link to the callee's page; two-stage enrichment keyed by API URL; chip overflow; wallet
      inference removed; balance lookup only for STX built-ins; live test requires the full corpus
- [x] Re-review fixes (2026-09-03, second independent pass at `2cdde2b4`): API key attached only to
      the configured public servers (`stacksAPIFetch`), transaction page + metadata never fetch a
      visitor-supplied host server-side; trait variables mapped to their bound arguments so each
      callee is searched only through the functions actually invoked on it; ambiguous resolutions
      carry no registry data; built-in fallbacks hedged as candidates until callees are ruled out;
      usage lines aggregated across helpers; string literals ignored when scanning arguments for
      principals and argument-named contracts reported separately from confirmed callees; context
      routes validate chain/API/params before the ETag (which now includes the chain) and reject
      unexpected parameters; no timestamp in the pack; contract cache keyed per network; custom
      networks told there is no pack; e2e generic assertion made real
- [x] Final audit fixes: unused/argument-only contracts no longer consume the callee budget or read
      as confirmed calls; trait bindings flow through helpers; cross-callee code collisions remain
      ambiguous; native errors remain hedged across untraced callees and retain their specific
      sender remedy; uint formatting is lossless; context packs omit mutable history and validate
      before 304; upstream failures keep their real status class; engine v3
- [x] `diagnose.ts` — `diagnoseSync` (Tier 0, no I/O) and `enrich` (Tier 1)
- [x] `context-pack.ts` — Markdown + JSON renderers, playbook, on-chain content delimited as data

**UI**

- [x] `useTxDiagnosis` — memoized Tier 0 from the already-cached contract; callee queries; gated
      correlation queries
- [x] `WhyItFailed` — Tier 0 (headline, sender action, fee invariant, "See details"), Tier 1 (facts
      with links, "For developers", agent hand-off: a single "Copy Prompt for Agent to Explore"
      button), Tier 2 (technical details as accordion rows — failing code, post-condition,
      arguments as the Function-called table, raw details as `DetailsCard` rows — each header with a
      one-line summary, the most relevant row open by default; chosen in the second mini design
      sprint on 2026-09-03 over a grid-plus-side-card and an inner-tabs variant); identifiers as
      copyable chips. Evidence chips were dropped from the card as duplicative of the facts; the
      context pack still carries them for agents
- [x] `ContractCallPage` integration; other tx types / statuses untouched
- [x] Post-conditions row highlight; Source tab `line` reveal + decoration; `?tab=` / `line` deep links
- [x] SSR: `page.tsx` fetches the contract for failed contract calls; `layout.tsx` metadata uses the headline

**Context pack**

- [x] `context.md` / `context.json` route handlers with cache + `X-Robots-Tag: noindex`; 404 for non-failed
- [x] Copy-prompt CTA (only agent CTA in v1)

**Quality**

- [x] Golden fixtures + `labels.json`; live acceptance test over the full corpus (`TX_DIAGNOSIS_LIVE=1`)
- [x] e2e: real failed txids in `e2e/failed-transactions-test-vector.ts`, Tier 0 asserted via
      `data-test` hooks; all nine cases passed locally (seven together, then the two pages that hit
      the public API's `429` limit passed individually after its retry window)
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm build`
- [x] Removed the temporary design-sprint route and mock stories
- [x] Docs (`docs/how-to-guides/transaction-failure-diagnosis.md`); CHANGELOG is generated by
      semantic-release from the Conventional Commit
- [x] PR per `pull_request_template.md` — https://github.com/stx-labs/explorer/pull/2830

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

In Review

## Notes

- Events are never retained on failed txs; "what moved" comes from `vm_error` text, arguments and source.
- Masked post-condition errors are 77% of post-condition failures in the corpus; genuine rollbacks are
  8/489 (asset-unchecked 5, amount 2, NFT 1, principal-mismatch 0).
- Error-code masking is a distinct pattern from post-condition masking: the dlmm routers' nine fold
  helpers each start with `(unwrap! result ERR_NO_RESULT_DATA)` on the accumulator, so `u2001` /
  `u5001` never identify the failing step. The engine reports these as placeholders; the agent
  playbook says to bisect the inputs with read-only calls instead of explaining the code.
- `stacksAPIFetch` used to attach the API key to every host, and several server components derive
  their API URL from a visitor-supplied `?api=`. The key is now scoped to the configured public
  servers app-wide, and the transaction page + metadata no longer fetch custom hosts server-side.
  Other pages (address, blocks, tokens, mempool …) still fetch a visitor-supplied host server-side,
  without the key; blocking or allowlisting those is a separate change.
- "Retried successfully" originally matched sender + function only; a BNS `name-claim-fast` failure
  (`ERR-NAME-NOT-AVAILABLE`) was followed by successes for other names, which is not a retry. The
  match now compares argument reprs and the copy says which case applies.
- Route handlers follow the existing `NextRequest` + `Response.json` / `next: { revalidate }` style.
