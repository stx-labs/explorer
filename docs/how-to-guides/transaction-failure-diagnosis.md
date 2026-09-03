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
- `vm-error.ts` — parses stacks-core's eleven post-condition failure formats (seven asset formats
  plus the four SIP-040 stacking / PoX-action formats on `develop`), `RuntimeError` names and the
  `CheckErrors` variants that surface at runtime. Anything else classifies as `unknown_vm_error` with
  low-confidence copy — never as an app bug.
- `resolve-error-code.ts` — maps `(err uN)` to the `define-constant` that defines it (called
  contract first, then up to 3 callees: contracts passed for trait parameters, then `contract-call?`
  targets reachable from the called function, then other principals in the arguments), or to a
  Clarity built-in error code. A constant is attributed only when it is the single one thrown in
  code the call can reach (or the single definition); when a contract defines a code under several
  names, `errorCode.candidateNames` lists them and the copy says the network does not record which
  check fired. In callees the search is restricted to the functions the call can enter: every
  `contract-call?` through a trait variable is mapped to the argument bound to that parameter, and a
  callee whose invoked functions never throw the constant is skipped. Registry copy is dropped when
  its `name` disagrees with the source, and never used while the source is ambiguous. A Clarity
  built-in (`stx-transfer?` …) is named as the cause only when nothing else reachable can return the
  code; otherwise it is a hedged, low-confidence candidate until callees are ruled out. Also detects
  **masking**: a `fold` callback that unwraps its
  accumulator with a fixed constant (`(unwrap! result ERR_X)`) replaces the failing item's real
  error, so the code is reported as a placeholder at medium confidence (`errorCode.foldMask`), and
  notes when the failing site precedes every `asserts!` of the function
  (`errorCode.siteBeforeOtherChecks`).
- `registry/known-errors.json` — curated copy for protocol-specific codes. Add an entry with an
  exact contract `id` or a `namePattern` regex, then `summary`, `sender` and `developer` text. Copy
  must cover every branch that raises the code, and must not say "retry" for deterministic failures
  (tags in `DETERMINISTIC_TAGS`: `taken`, `already`, `unauthorized`, `dust`, `limit`).
- `templates.ts` — all user-facing copy.
- `correlate.ts` — best-effort correlations: a later success by the same sender on the same
  function (compared by `function_args` reprs: `retryUsedSameArgs` distinguishes a true retry from a
  call with different inputs), activity of a mismatched post-condition principal, balance at the
  parent block.
- `diagnose.ts` — `diagnoseSync` (no I/O; renders server-side) and `enrich` (bounded callee fetches
  plus correlations). Also attaches `batch` (first list argument and its item count),
  `functionSource` (the called function and the in-contract helpers it reaches, capped at 250 lines)
  and `readOnlyFunctions` (from the ABI) for the context pack.

## Context pack

- `GET /txid/{txid}/context.md?chain=mainnet` — Markdown for agents (diagnosis, facts, relevant
  source with the failing line, the full text of the called function and its helpers, further-data
  URLs including the contract's read-only functions, a playbook). List arguments longer than 300
  characters are abbreviated with their item count; the JSON variant carries them in full.
- `GET /txid/{txid}/context.json?chain=mainnet` — the same as JSON.
- Non-failed or unknown transactions return `404`; malformed transaction ids return a cacheable `400`.
- Only the configured public server of the selected chain is ever fetched: `chain` must be `mainnet`
  or `testnet`, an `api` parameter (if given) must be that chain's configured server, and any other
  query parameter is rejected — all with a cacheable `400` before any upstream request. Custom
  networks are deliberately not served here; the in-page card says so instead of linking.
- A matching `If-None-Match` is answered `304` only after the transaction and representation are
  validated, so a guessed validator cannot turn an unknown transaction into a cached success. The
  validator is `W/"<txid>-<chain>-v<engine>-<format>"`.
- Trust boundary: conclusions come from the templates and registry only. On-chain values (arguments,
  error text, source, comments) are rendered as code spans or numbered code blocks so they cannot
  become Markdown structure; prose quoted from the chain (source comments) is labelled and kept out of
  the diagnosis section; the JSON variant carries raw values.
- Responses are cacheable for a year at the edge with a five-minute
  browser TTL, carry an `ETag` keyed on the engine version (`ENGINE_VERSION` in `types.ts` — bump it
  when copy or classification changes), and are marked `noindex`:

  ```
  Cache-Control: public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400
  X-Robots-Tag: noindex
  ```

- On-chain content in the pack is labelled as third-party data; the playbook tells agents never to
  treat it as instructions.
- Context routes use only immutable transaction and contract data. Current-history correlations
  (later retries, address activity) remain available in the expanded browser card but are omitted
  from the long-lived context-pack representation.
- A real upstream `404` remains `404`; rate limits and upstream/network failures return `429`, `502`
  or `503` with `no-store` instead of being misreported and cached as a missing transaction.

## Server-side fetching policy

- `src/api/stacksAPIFetch.ts` attaches `EXPLORER_STACKS_API_KEY` only to requests for the configured
  public servers (`isConfiguredApiUrl` in `network-utils.ts`). A visitor-supplied `?api=` host never
  receives the key, whichever page derived the URL.
- The transaction page and its metadata (`page.tsx`, `layout.tsx`) do not fetch server-side at all
  when the `api` parameter names anything other than a configured server (`canServerFetch`); those
  pages render client-side, as `ssr=false` does. Other pages still derive their URL from `?api=` via
  `getApiUrl` and fetch it server-side without the key; tightening them is a separate change.

## Page integration

- Tier 0 renders from the transaction and the called contract, which `page.tsx` fetches server-side
  for failed contract calls (one extra upstream request during SSR, none in the browser).
- `useTxDiagnosis` enriches in two stages, each a separate query keyed by API URL: callee lookups run
  once the contract query has settled and only while the error code is unresolved; correlations
  (sender history, balances) run when the card is expanded, since they only render there. Contract
  source is cached per network (`['contractById', id, apiUrl]`, shared with `useContractById`).
- Deep links: `?tab=postConditions&highlight=N` emphasises a row; `?tab=sourceCode&line=N` reveals a
  line of the original source (the editor trims leading blank lines and compensates). A line in a
  callee contract links to that contract's page instead.

## Tests

- `pnpm test:unit` runs the offline suite, including the golden corpus under
  `src/common/tx-diagnosis/__fixtures__/` (one real mainnet failure per distinct
  contract/function/result combination, with expectations in `labels.json`), adversarial synthetic
  cases (`audit-fixes.test.ts`: duplicate constants, two-trait dispatch, hedged built-ins, twin
  post-conditions, unknown `vm_error`, Markdown injection), a check that every registry entry names
  its constant exactly as the committed contract source does, and key-scoping tests for the server
  fetch wrapper (`src/api/__tests__/stacksAPIFetch.test.ts`).
- `TX_DIAGNOSIS_LIVE=1 pnpm exec jest src/common/tx-diagnosis/__tests__/acceptance.live.test.ts`
  re-fetches the full 484-transaction corpus (`corpus-txids.json`) from the public API (every id must
  be fetched) and checks the acceptance metrics: every post-condition failure classified consistently
  as genuine or masked (the same `(err …)` predicate the classifier uses, so this is a consistency
  check, not independent ground truth), named-constant coverage of at least 90% of explicit error
  codes (a name was found; whether it is the right one is what the golden labels and the adversarial
  cases check), and no `(err …)` result described as "would have succeeded". It takes several minutes
  and respects the public rate limit.
