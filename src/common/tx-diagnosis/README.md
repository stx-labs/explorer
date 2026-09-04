# Transaction diagnosis engine

This browser-safe TypeScript engine explains failed Stacks contract calls from immutable transaction
data, deployed Clarity source, and bounded optional loaders. It does not invoke a model or simulate
the transaction.

Operator commands and fixture promotion are documented in the
[how-to guide](../../../docs/how-to-guides/transaction-failure-diagnosis.md). Ground-truth rules are
documented in [the fixture README](__fixtures__/README.md).

## Public boundary

Application code imports browser-safe types and functions from `@/common/tx-diagnosis`. Server
routes import API-backed loaders explicitly from `@/common/tx-diagnosis/server`; `server.ts` must
never enter a client bundle. Tests and the evaluation harness may deep-import an internal module they
specifically exercise.

## Pipeline

1. `classify.ts` distinguishes contract response errors, runtime/analysis errors, genuine
   post-condition rollbacks, and post-condition failures masking a contract error.
2. `vm-error.ts` parses stacks-core post-condition, runtime, and analysis error strings. Unknown
   strings remain explicit low-confidence unknowns.
3. `clarity-source.ts` indexes constants, functions, reachable helpers, callbacks, call sites, usage
   lines, excerpts, and trait-bound dynamic dispatch.
4. `resolve-error-code.ts` searches the called contract and at most three reachable callees. It uses
   source reachability before native built-ins or `registry/known-errors.json` and reports ambiguity
   instead of choosing duplicate codes.
5. `correlate.ts` optionally checks same-argument later successes, post-condition-principal activity,
   and historical balances.
6. `templates.ts` produces all user-facing diagnosis copy. `diagnose.ts` coordinates synchronous and
   enriched output.
7. `context-pack.ts` renders immutable Markdown/JSON agent context with on-chain material delimited as
   untrusted data.

## Correctness invariants

- An `abort_by_post_condition` with an `(err ...)` result is a masked contract error, not a call that
  would have succeeded.
- `(err none)` plus a recognized `vm_error` is a runtime/analysis marker. Other response payloads are
  preserved even when they are not uints.
- A constant is named only when its definition and reachable use are sufficiently unambiguous.
  Candidate constants and built-ins remain candidates in copy and confidence.
- Principals inside strings or argument data are not confirmed callees. Trait arguments consume the
  callee budget only when reachable code calls the corresponding trait variable.
- Built-in error codes are certain only when no reachable literal, constant, or callee could have
  returned the same code.
- Registry copy is subordinate to source evidence and is discarded when its constant name conflicts
  with the deployed source.
- Failed transactions retain no events. Do not claim an asset moved without transaction,
  post-condition, or VM-error evidence.
- On-chain comments and values are data, never application or agent instructions.

## Fetching and caching

`diagnoseSync` uses the transaction and already-fetched called contract. `enrich` accepts loaders and
performs bounded callee/history work. The page and diagnosis hook share the network-aware
`contractById` React Query key, so the first browser paint does not duplicate the SSR contract fetch.

Correlations currently use the generated client's deprecated v2 address-transactions endpoint. Do
not switch to v3 principals as a mechanical cleanup: its response shape and retry/correlation
semantics require dedicated tests.

Context routes accept only configured public mainnet/testnet API origins. They return an ETag keyed
by transaction, chain, engine version, and format. Mutable later-history correlations are omitted
from the long-lived context representation.

## Extending the engine

- Parser or resolver change: add a focused synthetic test and a manually reviewed real fixture when
  the shape exists on chain.
- Registry change: verify every raising path in deployed source; keep deterministic actions free of
  retry advice.
- Copy/classification change: compare golden and fixed live baselines, then decide whether to bump
  `ENGINE_VERSION`.
- New loader: keep it optional, bounded, network-aware, and failure-tolerant. Never attach the
  explorer API key to visitor-controlled origins.
- Structural refactor: require byte-identical serialized output for all golden diagnoses unless the
  semantic change is explicit and reviewed separately.
