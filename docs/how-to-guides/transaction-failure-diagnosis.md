---
Title: Transaction Failure Diagnosis
---

# Transaction Failure Diagnosis

Failed contract calls (`tx_status` of `abort_by_response` or `abort_by_post_condition`) get a
deterministic "Why it failed" card on the transaction page and a machine-readable context pack for
AI agents. No language model is involved; everything is derived from the Stacks API and on-chain
contract source.

## Engine

`src/common/tx-diagnosis/` is a pure TypeScript module:

- `classify.ts` — class and subkind from the transaction alone (contract error, runtime panic,
  analysis error, post-condition rollback, post-condition failure that masks a contract error).
- `vm-error.ts` — parses stacks-core's seven post-condition failure formats and `RuntimeError` names.
- `resolve-error-code.ts` — maps `(err uN)` to the `define-constant` that defines it (called
  contract first, then up to 3 callees, including contracts passed as trait arguments), or to a
  Clarity built-in error code.
- `registry/known-errors.json` — curated copy for protocol-specific codes. Add an entry with an
  exact contract `id` or a `namePattern` regex, then `summary`, `sender` and `developer` text.
- `templates.ts` — all user-facing copy.
- `diagnose.ts` — `diagnoseSync` (no I/O; renders server-side) and `enrich` (bounded callee fetches
  plus correlations: later successful retry, activity of a mismatched post-condition principal).

## Context pack

- `GET /txid/{txid}/context.md?chain=mainnet` — Markdown for agents (diagnosis, facts, relevant
  source with the failing line, further-data URLs, a playbook).
- `GET /txid/{txid}/context.json?chain=mainnet` — the same as JSON.
- Non-failed or unknown transactions return `404`.
- Responses are cacheable for a year at the edge (transactions are immutable) with a five-minute
  browser TTL, carry an `ETag` keyed on the engine version (`ENGINE_VERSION` in `types.ts` — bump it
  when copy or classification changes), and are marked `noindex`:

  ```
  Cache-Control: public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400
  X-Robots-Tag: noindex
  ```

- On-chain content in the pack is labelled as third-party data; the playbook tells agents never to
  treat it as instructions.

## Tests

- `pnpm test:unit` runs the offline suite, including the golden corpus under
  `src/common/tx-diagnosis/__fixtures__/` (one real mainnet failure per distinct
  contract/function/result combination, with expectations in `labels.json`).
- `TX_DIAGNOSIS_LIVE=1 pnpm exec jest src/common/tx-diagnosis/__tests__/acceptance.live.test.ts`
  re-fetches the full 489-transaction corpus (`corpus-txids.json`) from the public API and checks the
  acceptance metrics: every post-condition failure classified correctly as genuine or masked, at
  least 90% of explicit error codes resolved to a named constant, and no `(err …)` result described
  as "would have succeeded". It takes several minutes and respects the public rate limit.
