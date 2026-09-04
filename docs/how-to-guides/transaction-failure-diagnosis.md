---
Title: Transaction Failure Diagnosis
---

# Transaction Failure Diagnosis

Failed contract calls receive a deterministic explanation in the transaction page and Markdown/JSON
context packs for agents. See the
[engine README](../../src/common/tx-diagnosis/README.md) for architecture, safety invariants, and
extension points; see the [fixture README](../../src/common/tx-diagnosis/__fixtures__/README.md) for
ground-truth requirements.

## Context-pack endpoints

- `GET /txid/{txid}/context.md?chain=mainnet`
- `GET /txid/{txid}/context.json?chain=mainnet`

Use `chain=testnet` for testnet. An `api` parameter is accepted only when it is exactly the configured
server for that chain. Custom hosts and unexpected query parameters are rejected.

Failed contract calls return `200`; unknown, successful, and unsupported transactions return `404`.
Malformed transaction IDs return `400`. Successful responses are immutable and edge-cacheable;
transient upstream failures are `no-store`.

## Offline verification

Run the normal repository checks:

```bash
fnm exec --using=22 -- pnpm diagnosis:build
fnm exec --using=22 -- pnpm typecheck
fnm exec --using=22 -- pnpm lint
fnm exec --using=22 -- pnpm test:unit
fnm exec --using=22 -- pnpm build
```

The unit suite includes 54 golden labeled cases, adversarial synthetic cases, registry/source
agreement, context-pack trust-boundary coverage, and the deterministic rubric.

## Live acceptance suite

```bash
TX_DIAGNOSIS_LIVE=1 fnm exec --using=22 -- pnpm exec jest \
  src/common/tx-diagnosis/__tests__/acceptance.live.test.ts
```

The suite re-fetches all 484 transaction IDs in `corpus-txids.json`. It checks that every ID was
fetched, post-condition classification is internally consistent, at least 90% of explicit uint
codes receive a candidate name, and no `(err ...)` result is described as having succeeded. It uses
the public API, takes several minutes, and may encounter public rate limits.

## Evaluate recent failures

Build before running the harness:

```bash
fnm exec --using=22 -- pnpm diagnosis:eval -- --count 100 --strict
```

Useful options:

- `--count N`, `--per-combo N`, `--max-pages N`: control the stratified recent-failure sample.
- `--tx <id>`: evaluate a specific user report; repeat for several IDs.
- `--cases <run>/cases.json`: re-run a saved set after an engine change.
- `--baseline <run>/report.json`: report every changed class, outcome, confidence, constant, or
  headline.
- `--correlate`: exercise browser-only history loaders.
- `--api`, `--chain`, `--explorer`, `--out`: override endpoints and output location.
- `--judge`: add a capped advisory LLM grade. It never gates; it requires `ANTHROPIC_API_KEY`, prints
  a token estimate, and accepts `--judge-limit` and `--judge-model`.

Runs write ignored `cases.json`, `report.json`, and `report.md` files under
`.ai-runs/tx-diagnosis/<timestamp>/`. Inspect unresolved/ambiguous codes, unknown VM errors, runtime
panics, and rubric failures first.

## Promote a failure to ground truth

```bash
fnm exec --using=22 -- pnpm diagnosis:promote -- --tx <id> --dry-run
fnm exec --using=22 -- pnpm diagnosis:promote -- --tx <id> --notes "why this case matters"
```

Promotion trims the transaction, records fetched contract sources, drafts a label, and adds the ID
to the live list. The draft is not ground truth. Before committing:

1. Read the deployed source and failing path.
2. Correct `expected_err_name`, `expected_defined_in`, and `expected_tag` when necessary.
3. Confirm every registry sentence covers every source path that raises the code.
4. Run the golden/rubric suite and the relevant baseline comparison.
5. Keep bulky or mutable API fields out of fixtures; mark deliberately excerpted sources.

When refreshing an existing case, remove or explicitly update its old fixture first; promotion skips
existing files to avoid silently overwriting reviewed evidence.

## Changing diagnosis behavior

For copy, classification, or serialization changes:

1. Compare all golden outputs and a fixed live `cases.json` baseline.
2. Add or update a manually reviewed fixture for every intentional semantic change.
3. Bump `ENGINE_VERSION` when cached Markdown/JSON output can change.
4. Verify Markdown trust-boundary tests and both context formats.
5. Report any live suite or Playwright check that could not be run.
