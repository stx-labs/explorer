# Transaction diagnosis fixtures

These fixtures are reviewed ground truth for deterministic transaction-failure diagnosis. Generated
labels are only drafts; every expected constant, defining contract, tag, and special-case note must
be checked against deployed source before commit.

## Datasets

- `labels.json`: 54 labeled golden cases. `count` is the number of historical observations the case
  represents; the current weights sum to 490 and are not the number of fixture files.
- `corpus-txids.json`: 484 transaction IDs used by the opt-in live acceptance suite. This list is
  larger than the golden set and is not independently labeled ground truth.
- `txs/`: trimmed immutable transaction responses keyed by transaction ID.
- `contracts/`: deployed sources needed by golden resolution. Sources over the fixture size limit can
  be deliberately excerpted; the corresponding label must set `excerpt: true`.

Do not describe the 54 labels, 484 live IDs, and 490 weighted observations as one corpus size.

## Label expectations

Each label identifies its transaction, called contract/function, failure class, and expected
resolution. Depending on the case it can assert the response code, constant name, defining contract,
semantic tag, confidence-relevant notes, or an excerpted source. `all_tx_ids` groups equivalent
historical failures; `count` records their weight.

The golden tests also enforce cross-cutting invariants: class-specific copy, sender action, fee/asset
invariant, honest confidence, and no “would have succeeded” language for `(err ...)` results.

## Adding or refreshing a case

Use the documented promotion command in the
[how-to guide](../../../../docs/how-to-guides/transaction-failure-diagnosis.md). Then:

1. Read the actual deployed source and reachable failing path; do not accept the resolver's current
   regex output as truth.
2. Check duplicate constants with the same uint value and verify the expected constant is reachable.
3. Verify `expected_defined_in` against a committed source fixture.
4. Review protocol-specific registry sentences against every path that raises the code.
5. Remove unused bulky API fields and secrets. The engine does not read transaction hex blobs.
6. Run the focused test, complete golden/rubric suite, and any relevant live baseline.

Promotion intentionally skips existing fixture files. To refresh one, review and replace it
explicitly so previously approved evidence is not overwritten silently.
