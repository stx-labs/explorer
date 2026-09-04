/**
 * Golden-corpus tests: one real mainnet failure per distinct (contract, function, result) combo,
 * with expectations derived from the research corpus (2026-08-23 → 09-03) plus the canonical sBTC case.
 */
import { classifyFailure } from '../classify';
import { diagnoseSync, enrich } from '../diagnose';
import { resolveErrorCodeSync } from '../resolve-error-code';
import { tagForName } from '../tags';
import { SBTC_TX_ID, fixtureLoader, labels, loadContract, loadTx } from '../test-utils/fixtures';

describe('golden corpus', () => {
  it('has fixtures for every label', () => {
    for (const l of labels) expect(() => loadTx(l.tx_id)).not.toThrow();
  });

  describe('classification', () => {
    for (const l of labels) {
      it(`${l.contract.split('.')[1]}.${l.fn} ${l.result.slice(0, 24)} → ${l.expected_class}`, () => {
        const cls = classifyFailure(loadTx(l.tx_id));
        expect(cls.class).toBe(l.expected_class);
        if (l.err_code) expect(cls.errorCode).toBe(l.err_code);
      });
    }
  });

  it('classifies masked post-condition failures as contract errors, never as would-have-succeeded', () => {
    const masked = labels.filter(l => l.expected_class === 'post_condition_masked_error');
    expect(masked.length).toBeGreaterThan(0);
    for (const l of masked) {
      const tx = loadTx(l.tx_id);
      const d = diagnoseSync(tx, loadContract(l.contract));
      expect(d.class).toBe('post_condition_masked_error');
      expect(d.headline.toLowerCase()).not.toContain('would have succeeded');
      expect(d.whatHappened.some(f => f.parts.join('').includes('Because the call failed'))).toBe(
        true
      );
    }
  });

  describe('error-code resolution against the called contract', () => {
    const resolvable = labels.filter(
      l => l.err_code && l.expected_err_name && l.expected_defined_in === l.contract
    );
    it('covers at least 90% of explicit error codes in the corpus (weighted by occurrences)', () => {
      // Each golden fixture stands for `count` real transactions; the unresolved combos are almost
      // all single-transaction bot contracts, so the acceptance metric is per transaction.
      const withCode = labels.filter(l => l.err_code);
      let resolved = 0;
      let total = 0;
      for (const l of withCode) {
        const tx = loadTx(l.tx_id);
        const r = resolveErrorCodeSync(l.err_code!, tx, loadContract(l.contract));
        total += l.count;
        if (r.info.name) resolved += l.count;
      }
      expect(resolved / total).toBeGreaterThanOrEqual(0.9);
    });
    for (const l of resolvable) {
      it(`${l.contract.split('.')[1]} ${l.err_code} → ${l.expected_err_name}`, () => {
        const r = resolveErrorCodeSync(l.err_code!, loadTx(l.tx_id), loadContract(l.contract));
        expect(r.info.name).toBe(l.expected_err_name);
        expect(r.info.definedIn).toBe(l.contract);
        expect(r.info.definitionLine).toBeGreaterThan(0);
      });
    }
    it('rejects bare-constant false positives (MIN_STEPS u1 must not explain (err u1))', () => {
      const l = labels.find(x => x.notes?.includes('pattern-B false positive'));
      expect(l).toBeDefined();
      const r = resolveErrorCodeSync(l!.err_code!, loadTx(l!.tx_id), loadContract(l!.contract));
      expect(r.info.name).not.toBe('MIN_STEPS');
    });
    it('falls back to the Clarity built-in when a single native call can produce the code', () => {
      const l = labels.find(x => x.native_candidates?.length === 1);
      expect(l).toBeDefined();
      const r = resolveErrorCodeSync(l!.err_code!, loadTx(l!.tx_id), loadContract(l!.contract));
      expect(r.info.nativeFunction).toBe(l!.native_candidates![0]);
      expect(r.info.nativeMeaning).toBeTruthy();
    });
  });

  it('tags agree with the corpus labels', () => {
    for (const l of labels) {
      if (l.expected_err_name && l.expected_tag && l.expected_tag !== 'unknown') {
        expect({ name: l.expected_err_name, tag: tagForName(l.expected_err_name) }).toEqual({
          name: l.expected_err_name,
          tag: l.expected_tag,
        });
      }
    }
  });

  describe('diagnoseSync', () => {
    for (const l of labels) {
      it(`produces a class-specific diagnosis for ${l.contract.split('.')[1]}.${l.fn}`, () => {
        const tx = loadTx(l.tx_id);
        const d = diagnoseSync(tx, loadContract(l.contract));
        expect(d.headline.length).toBeGreaterThan(20);
        expect(d.headline.length).toBeLessThanOrEqual(200);
        expect(d.senderAction.length).toBeGreaterThan(10);
        expect(d.invariant).toMatch(/fee was spent/);
        expect(d.whatHappened.length).toBeGreaterThanOrEqual(2);
        expect(d.evidence.length).toBeGreaterThan(0);
        if (tx.tx_result?.repr.startsWith('(err')) {
          expect(d.headline.toLowerCase()).not.toContain('would have succeeded');
        }
        if (d.class === 'runtime_panic') {
          expect(d.runtime?.variant).toBe(l.expected_subkind);
        }
      });
    }
  });

  describe('the canonical sBTC principal mismatch', () => {
    const tx = loadTx(SBTC_TX_ID);
    const contract = loadContract('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal');

    it('is a genuine post-condition rollback with a principal mismatch', () => {
      const cls = classifyFailure(tx);
      expect(cls.class).toBe('post_condition');
      expect(cls.postCondition).toMatchObject({
        problem: 'principal_mismatch',
        index: 0,
        movedBy: 'SP3TP4PSXBGMSMYVAPVZ00ZN7PB79MAJ3X9SQP8H',
        principal: 'SP11DP8H1Y9B7JYXC0T5AEZWENDWSSBCVKETSQ1R3',
      });
    });

    it('explains the account mismatch and the fee-only outcome', () => {
      const d = diagnoseSync(tx, contract);
      expect(d.headline).toMatch(/different account than the one that signed/);
      expect(d.invariant).toMatch(/No sbtc-token moved/);
      expect(d.developerNote?.some(p => typeof p !== 'string' && p.value === 'Pc.origin()')).toBe(
        true
      );
      expect(d.confidence).toBe('high');
    });

    it('enriches with correlations from injected history', async () => {
      const d = await enrich(tx, contract, {
        contracts: fixtureLoader,
        history: {
          senderTransactions: async () => [
            {
              tx_id: '0xbef744b8d1f2ba0ea3bea094be670758fb0d909f301b2a52842b5278bdfa41dd',
              tx_status: 'success',
              block_height: tx.block_height + 9464,
              contract_id: tx.contract_call.contract_id,
              function_name: tx.contract_call.function_name,
            },
          ],
          addressTxCount: async () => 160,
        },
      });
      expect(d.related.retriedSuccessfullyIn).toBe(
        '0xbef744b8d1f2ba0ea3bea094be670758fb0d909f301b2a52842b5278bdfa41dd'
      );
      expect(d.related.pcPrincipalTxCount).toBe(160);
      const text = d.whatHappened
        .map(f => f.parts.map(p => (typeof p === 'string' ? p : p.label)).join(''))
        .join('\n');
      expect(text).toMatch(/active account/);
      expect(text).toMatch(/A later call to the same function from your account succeeded in/);
    });
  });
});
