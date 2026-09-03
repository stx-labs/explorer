/**
 * @jest-environment node
 *
 * Live acceptance over the full research corpus (489 mainnet failures). Transactions and contracts
 * are immutable, so re-fetching them is reproducible. Opt in with:
 *
 *   TX_DIAGNOSIS_LIVE=1 pnpm exec jest src/common/tx-diagnosis/__tests__/acceptance.live.test.ts
 *
 * Skipped by default so `pnpm test:unit` stays offline and fast. The public API allows ~20 req/s
 * per client; the loop stays well under that and backs off on 429s.
 */
import txIds from '../__fixtures__/corpus-txids.json';
import { classifyFailure } from '../classify';
import { diagnoseSync } from '../diagnose';
import { resolveErrorCodeSync } from '../resolve-error-code';
import type { ContractInfo, FailedContractCallTx } from '../types';
import { isFailedContractCall } from '../types';

const API = process.env.TX_DIAGNOSIS_API_URL || 'https://api.hiro.so';
const live = process.env.TX_DIAGNOSIS_LIVE === '1';
const describeLive = live ? describe : describe.skip;
const CONCURRENCY = 2;
const MIN_COVERAGE = 0.8;

async function getJson<T>(url: string, attempt = 0): Promise<T> {
  const res = await fetch(url);
  if ((res.status === 429 || res.status >= 500) && attempt < 8) {
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

describeLive('live corpus acceptance', () => {
  jest.setTimeout(30 * 60 * 1000);

  it('meets the acceptance metrics on the failed transactions in the corpus', async () => {
    const contracts = new Map<string, ContractInfo | null>();
    const loadContract = async (id: string) => {
      if (!contracts.has(id)) {
        try {
          const c = await getJson<{ source_code: string }>(`${API}/extended/v1/contract/${id}`);
          contracts.set(id, { contract_id: id, source_code: c.source_code });
        } catch {
          contracts.set(id, null);
        }
      }
      return contracts.get(id) ?? null;
    };

    const ids = txIds as string[];
    const fetched = await mapLimit(ids, CONCURRENCY, id =>
      getJson<FailedContractCallTx>(`${API}/extended/v1/tx/${id}`).catch(() => null)
    );
    const txs = fetched.filter((t): t is FailedContractCallTx => !!t && isFailedContractCall(t));
    // eslint-disable-next-line no-console
    console.log(`fetched ${txs.length}/${ids.length} corpus transactions`);
    expect(txs.length / ids.length).toBeGreaterThanOrEqual(MIN_COVERAGE);

    let pcTotal = 0;
    let pcCorrect = 0;
    let codeTotal = 0;
    let codeResolved = 0;
    let wouldHaveSucceededOnErr = 0;
    const classes = new Map<string, number>();

    for (const tx of txs) {
      const cls = classifyFailure(tx);
      classes.set(cls.class, (classes.get(cls.class) ?? 0) + 1);
      const called = await loadContract(tx.contract_call.contract_id);
      const d = diagnoseSync(tx, called);

      if (tx.tx_status === 'abort_by_post_condition') {
        pcTotal++;
        const isErr = (tx.tx_result?.repr ?? '').startsWith('(err');
        if (
          (isErr && cls.class === 'post_condition_masked_error') ||
          (!isErr && cls.class === 'post_condition')
        )
          pcCorrect++;
      }
      if (cls.errorCode) {
        codeTotal++;
        if (resolveErrorCodeSync(cls.errorCode, tx, called).info.name) codeResolved++;
      }
      if (
        (tx.tx_result?.repr ?? '').startsWith('(err') &&
        /would have succeeded/i.test(d.headline)
      ) {
        wouldHaveSucceededOnErr++;
      }
      expect(d.headline.length).toBeGreaterThan(20);
    }

    // eslint-disable-next-line no-console
    console.log(
      `corpus: ${txs.length} txs · classes ${JSON.stringify(Object.fromEntries(classes))} · ` +
        `PC classification ${pcCorrect}/${pcTotal} · codes resolved ${codeResolved}/${codeTotal} ` +
        `(${((100 * codeResolved) / Math.max(codeTotal, 1)).toFixed(1)}%)`
    );

    expect(pcCorrect).toBe(pcTotal);
    expect(codeResolved / Math.max(codeTotal, 1)).toBeGreaterThanOrEqual(0.9);
    expect(wouldHaveSucceededOnErr).toBe(0);
  });
});
