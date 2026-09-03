/**
 * Behaviour added after auditing agent output on real failures (2026-09-03): fold-accumulator
 * error masking, argument-aware retry detection, deterministic "taken" failures, evaluation-order
 * notes and the richer context pack.
 */
import {
  findFunctionBody,
  firstAssertLine,
  foldAccumulatorUnwrap,
  foldCallbackNames,
  functionParams,
  functionSourceLines,
  listItemCount,
  reachableFunctions,
} from '../clarity-source';
import { renderContextPackMarkdown } from '../context-pack';
import { correlate } from '../correlate';
import { diagnoseSync, enrich } from '../diagnose';
import { lookupRegistry } from '../registry';
import { DETERMINISTIC_TAGS, tagForName } from '../tags';
import { fixtureLoader, labels, loadContract, loadTx } from '../test-utils/fixtures';
import type { AddressTxSummary, Diagnosis, FailedContractCallTx } from '../types';

/** The real batch-liquidity failure in the corpus (either router version). */
const GOLDEN = labels.find(
  l => /\.dlmm-liquidity-router-v-/.test(l.contract) && l.err_code === 'u5001'
)!;

const SAMPLE = `
(define-constant ERR_NO_RESULT_DATA (err u5001))
(define-constant ERR_TOO_SMALL (err u5002))
(define-constant ERR_NOT_OWNER (err u5003))

(define-private (add-one
    (item { amount: uint })
    (result (response (list 10 uint) uint))
  )
  (let (
      (acc (unwrap! result ERR_NO_RESULT_DATA))
    )
    (asserts! (> (get amount item) u0) ERR_TOO_SMALL)
    (ok acc)
  )
)

(define-public (add-many (items (list 10 { amount: uint })))
  (let (
      (owner (unwrap! (map-get? owners tx-sender) ERR_NOT_OWNER))
    )
    (asserts! (> (len items) u0) ERR_TOO_SMALL)
    (fold add-one items (ok (list)))
  )
)
`;

describe('clarity-source: fold helpers and batch arguments', () => {
  it('reads parameter names from a function header', () => {
    const body = findFunctionBody(SAMPLE, 'add-one')!;
    expect(functionParams(body)).toEqual(['item', 'result']);
    expect(functionParams(findFunctionBody(SAMPLE, 'add-many')!)).toEqual(['items']);
  });

  it('finds fold callbacks reachable from the entry point', () => {
    const bodies = reachableFunctions(SAMPLE, 'add-many');
    expect(foldCallbackNames(bodies)).toEqual(['add-one']);
  });

  it('detects the accumulator unwrap that masks the real error', () => {
    const mask = foldAccumulatorUnwrap(SAMPLE, 'add-many', 'ERR_NO_RESULT_DATA');
    expect(mask).toEqual({ helper: 'add-one', accumulatorParam: 'result', line: 11 });
    // A constant thrown by an ordinary assert is not a mask.
    expect(foldAccumulatorUnwrap(SAMPLE, 'add-many', 'ERR_TOO_SMALL')).toBeNull();
  });

  it('counts top-level items of a list repr', () => {
    expect(listItemCount('(list u1 u2 u3)')).toBe(3);
    expect(
      listItemCount(
        '(list (tuple (amount u1) (id (list u1 u2))) (tuple (amount u0) (id (list))) (tuple (amount u2) (id none)))'
      )
    ).toBe(3);
    expect(listItemCount('(list)')).toBe(0);
    expect(listItemCount('u5')).toBeNull();
    expect(listItemCount("'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2")).toBeNull();
  });

  it('locates the first asserts! of a function', () => {
    expect(firstAssertLine(SAMPLE, findFunctionBody(SAMPLE, 'add-many')!)).toBe(22);
    expect(firstAssertLine(SAMPLE, findFunctionBody(SAMPLE, 'add-one')!)).toBe(13);
  });

  it('returns whole function bodies in source order with a cap', () => {
    const bodies = reachableFunctions(SAMPLE, 'add-many');
    const full = functionSourceLines(SAMPLE, bodies, 500);
    expect(full.truncated).toBe(false);
    expect(full.lines[0].n).toBe(6); // add-one comes first in the file
    expect(full.lines.some(l => l.code.includes('(define-public (add-many'))).toBe(true);
    const capped = functionSourceLines(SAMPLE, bodies, 5);
    expect(capped.truncated).toBe(true);
    expect(capped.lines).toHaveLength(5);
  });

  it('matches the real dlmm liquidity router', () => {
    expect(GOLDEN).toBeDefined();
    const router = loadContract(GOLDEN.contract)!;
    const mask = foldAccumulatorUnwrap(router.source_code, GOLDEN.fn, 'ERR_NO_RESULT_DATA');
    expect(mask).not.toBeNull();
    expect(mask!.accumulatorParam).toBe('result');
    expect(mask!.helper).toMatch(/liquidity/);
  });
});

describe('diagnosis: masked fold errors', () => {
  it('says the code is a placeholder and lowers confidence', () => {
    const tx = loadTx(GOLDEN.tx_id);
    const d = diagnoseSync(tx, loadContract(GOLDEN.contract));
    expect(d.errorCode?.foldMask?.accumulatorParam).toBe('result');
    expect(d.confidence).toBe('medium');
    expect(d.headline).toMatch(/real error is not on chain/);
    expect(d.senderAction).not.toMatch(/^Retry;/);
    expect(d.evidence.map(e => e.id)).toEqual(expect.arrayContaining(['masked', 'batch']));
    expect(d.batch?.itemCount).toBeGreaterThan(0);
    expect(d.whatHappened.map(f => f.parts.join(''))).toEqual(
      expect.arrayContaining([expect.stringContaining('not recorded on chain')])
    );
    // The source excerpt points at the unwrap in the helper, not the constant definition.
    expect(d.source?.failingLine).toBe(d.errorCode?.foldMask?.line);
    expect(d.source?.functionName).toBe(d.errorCode?.foldMask?.helper);
  });

  it('carries the called function and its helpers into the context pack', () => {
    const tx = loadTx(GOLDEN.tx_id);
    const d = diagnoseSync(tx, loadContract(GOLDEN.contract));
    expect(d.functionSource?.functionName).toBe(GOLDEN.fn);
    expect(d.functionSource?.helpers.length).toBeGreaterThan(0);
    const md = renderContextPackMarkdown({
      tx,
      diagnosis: d,
      explorerBaseUrl: 'https://explorer.hiro.so',
      apiUrl: 'https://api.hiro.so',
      network: 'mainnet',
    });
    expect(md).toContain('- MASKED:');
    expect(md).toContain(`Full text of \`${GOLDEN.fn}\``);
    expect(md).toContain('/context.json?chain=mainnet');
    expect(md).toContain('- Batch: argument');
    expect(md).toContain('Watch for masking');
    expect(md).toContain('transient or deterministic');
  });
});

describe('diagnosis: evaluation order', () => {
  it('flags a failing site that precedes every asserts! of the function', () => {
    const tx = {
      tx_id: '0xabc',
      tx_status: 'abort_by_response',
      tx_type: 'contract_call',
      sender_address: 'SP000000000000000000002Q6VF78',
      block_height: 100,
      fee_rate: '1000',
      nonce: 1,
      sponsored: false,
      post_condition_mode: 'deny',
      post_conditions: [],
      tx_result: { hex: '0x', repr: '(err u5003)' },
      vm_error: null,
      contract_call: {
        contract_id: 'SP000000000000000000002Q6VF78.sample',
        function_name: 'add-many',
        function_signature: '',
        function_args: [{ name: 'items', type: 'list', repr: '(list u1)', hex: '0x' }],
      },
    } as unknown as FailedContractCallTx;
    const d = diagnoseSync(tx, {
      contract_id: 'SP000000000000000000002Q6VF78.sample',
      source_code: SAMPLE,
    });
    expect(d.errorCode?.name).toBe('ERR_NOT_OWNER');
    expect(d.errorCode?.siteBeforeOtherChecks).toBe(true);
    expect(d.whatHappened.map(f => f.parts.join(''))).toEqual(
      expect.arrayContaining([expect.stringContaining('were never evaluated')])
    );
    // The assert itself is not "before the other checks".
    const tx2 = {
      ...tx,
      tx_result: { hex: '0x', repr: '(err u5002)' },
    } as unknown as FailedContractCallTx;
    const d2 = diagnoseSync(tx2, {
      contract_id: 'SP000000000000000000002Q6VF78.sample',
      source_code: SAMPLE,
    });
    expect(d2.errorCode?.name).toBe('ERR_TOO_SMALL');
    expect(d2.errorCode?.siteBeforeOtherChecks).toBe(false);
  });
});

describe('retry detection compares arguments', () => {
  const tx = loadTx(labels[0].tx_id);
  const mine = (tx.contract_call.function_args ?? []).map(a => a.repr);
  const base: AddressTxSummary = {
    tx_id: '0xlater',
    tx_status: 'success',
    block_height: tx.block_height + 5,
    contract_id: tx.contract_call.contract_id,
    function_name: tx.contract_call.function_name,
  };
  const diagnosis = diagnoseSync(tx, loadContract(tx.contract_call.contract_id));

  async function run(list: AddressTxSummary[]) {
    return correlate(tx, diagnosis, { senderTransactions: async () => list });
  }

  it('prefers a later success with identical arguments', async () => {
    const related = await run([
      { ...base, tx_id: '0xdifferent', function_args_repr: [...mine, 'u999'] },
      { ...base, tx_id: '0xsame', function_args_repr: mine },
    ]);
    expect(related.retriedSuccessfullyIn).toBe('0xsame');
    expect(related.retryUsedSameArgs).toBe(true);
  });

  it('reports a later success with different arguments honestly', async () => {
    const related = await run([
      { ...base, tx_id: '0xdifferent', function_args_repr: [...mine, 'u999'] },
    ]);
    expect(related.retriedSuccessfullyIn).toBe('0xdifferent');
    expect(related.retryUsedSameArgs).toBe(false);
  });

  it('leaves the comparison undefined when arguments are unknown', async () => {
    const related = await run([base]);
    expect(related.retriedSuccessfullyIn).toBe('0xlater');
    expect(related.retryUsedSameArgs).toBeUndefined();
  });

  it('words the fact by what actually happened', async () => {
    const withDifferent: Diagnosis = await enrich(tx, loadContract(tx.contract_call.contract_id), {
      contracts: fixtureLoader,
      history: {
        senderTransactions: async () => [
          { ...base, tx_id: '0xdifferent', function_args_repr: [...mine, 'u999'] },
        ],
      },
    });
    const text = withDifferent.whatHappened.map(f => f.parts.join('')).join('\n');
    expect(text).toContain('with different inputs');
    expect(text).not.toContain('You retried');
  });
});

describe('deterministic failures never say "retry"', () => {
  it('tags availability errors as taken', () => {
    expect(tagForName('ERR-NAME-NOT-AVAILABLE')).toBe('taken');
    expect(tagForName('ERR_NAME_TAKEN')).toBe('taken');
    expect(tagForName('ERR-ALREADY-REGISTERED')).toBe('taken');
    expect(tagForName('ERR-ALREADY-STAKED')).toBe('already');
    expect(DETERMINISTIC_TAGS.has('taken')).toBe(true);
    expect(DETERMINISTIC_TAGS.has('slippage')).toBe(false);
  });

  it('carries BNS-V2 entries whose advice is not to retry', () => {
    const e = lookupRegistry('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2', 'u118');
    expect(e?.name).toBe('ERR-NAME-NOT-AVAILABLE');
    expect(e?.tag).toBe('taken');
    expect(e?.sender).toMatch(/cannot succeed/);
    expect(lookupRegistry('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2', 'u125')?.name).toBe(
      'ERR-FAST-MINTED-BEFORE'
    );
  });

  it('describes both branches that raise err-oracle-no-fallback', () => {
    const e = lookupRegistry(
      'SPT94T4HGFN8A99AH4DEE3E5EM7J6JN8FKY8KB7Z.bme024-0-market-scalar-pyth',
      'u10153'
    );
    expect(e?.summary).toMatch(/moved beyond/);
    expect(e?.summary).toMatch(/read failed its checks/);
  });
});
