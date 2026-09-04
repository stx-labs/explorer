import { diagnoseSync, enrich } from '../diagnose';
import { checkDiagnosis, resolutionOutcome, shapeKey } from '../eval/rubric';
import { fixtureLoader, labels, loadContract, loadTx } from '../test-utils/fixtures';
import type { Diagnosis, FailedContractCallTx } from '../types';

describe('diagnosis rubric', () => {
  it('holds for every golden case, before and after enrichment', async () => {
    const failures: string[] = [];
    for (const l of labels) {
      const tx = loadTx(l.tx_id);
      const contract = loadContract(l.contract);
      for (const d of [
        diagnoseSync(tx, contract),
        await enrich(tx, contract, { contracts: fixtureLoader }),
      ]) {
        const r = checkDiagnosis(tx, d);
        for (const f of r.failed) failures.push(`${l.tx_id.slice(0, 10)} ${f.rule}: ${f.detail}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('classifies resolution outcomes', () => {
    const base = (over: Partial<Diagnosis['errorCode']>): Diagnosis =>
      ({
        class: 'contract_error',
        errorCode: { code: 'u1', dynamicDispatch: false, candidatesTried: [], ...over },
      }) as unknown as Diagnosis;
    expect(resolutionOutcome(base({ name: 'ERR-X', definedIn: 'SP.a' }))).toBe('named');
    expect(resolutionOutcome(base({ candidateNames: ['A', 'B'] }))).toBe('ambiguous');
    expect(resolutionOutcome(base({ nativeFunction: 'stx-transfer?' }))).toBe('native_certain');
    expect(
      resolutionOutcome(base({ nativeFunction: 'stx-transfer?', nativeTentative: true }))
    ).toBe('native_tentative');
    expect(
      resolutionOutcome(
        base({ name: 'ERR_X', foldMask: { helper: 'h', accumulatorParam: 'r', line: 1 } })
      )
    ).toBe('masked');
    expect(resolutionOutcome(base({}))).toBe('unresolved');
    expect(resolutionOutcome({ class: 'runtime_panic' } as unknown as Diagnosis)).toBe(
      'not_applicable'
    );
  });

  it('catches inconsistent claims', () => {
    const tx = loadTx(labels[0].tx_id);
    const good = diagnoseSync(tx, loadContract(labels[0].contract));
    const bad: Diagnosis = {
      ...good,
      headline: 'Short.',
      senderAction: 'Retry',
      confidence: 'high',
      errorCode: {
        code: 'u1',
        dynamicDispatch: false,
        candidatesTried: [],
        name: 'ERR-TAKEN',
        reachable: false,
      },
      evidence: [{ id: 'tag', label: 'tag', value: 'taken' }],
      whatHappened: [
        { parts: ['It returned undefined'], link: { label: 'x', href: 'javascript:void' } },
      ],
    };
    const r = checkDiagnosis(tx, bad);
    expect(r.failed.map(f => f.rule)).toEqual(
      expect.arrayContaining([
        'headline-length',
        'sender-action',
        'no-template-artefacts',
        'unreachable-not-high',
        'deterministic-no-retry',
        'links-well-formed',
      ])
    );
    expect(shapeKey(tx, good)).toContain(tx.contract_call.function_name);
  });

  it('requires a certain native error to keep its deterministic remedy', () => {
    const original = loadTx(labels[0].tx_id);
    const tx = {
      ...original,
      tx_status: 'abort_by_response',
      tx_result: { hex: '0x', repr: '(err u1)' },
      vm_error: null,
      post_conditions: [],
      contract_call: {
        contract_id: 'SP000000000000000000002Q6VF78.demo',
        function_name: 'mint',
        function_signature: '(define-public (mint))',
        function_args: [],
      },
    } as FailedContractCallTx;
    const d = diagnoseSync(tx, {
      contract_id: tx.contract_call.contract_id,
      source_code:
        '(define-non-fungible-token item uint)\n(define-public (mint) (try! (nft-mint? item u1 tx-sender)))',
    });
    expect(d.senderAction).toBe('Use a different id.');
    expect(checkDiagnosis(tx, d).failed).toEqual([]);
  });
});
