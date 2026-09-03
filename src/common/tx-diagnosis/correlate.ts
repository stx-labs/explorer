import type {
  AddressTxSummary,
  Correlations,
  Diagnosis,
  FailedContractCallTx,
  HistoryLoader,
} from './types';

function argsRepr(tx: FailedContractCallTx): string[] {
  return (tx.contract_call.function_args ?? []).map(a => a.repr);
}

function sameArgs(a: string[] | undefined, b: string[]): boolean | undefined {
  if (!a) return undefined;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Cheap, deferred enrichments. Each is one API call, gated by class, and best-effort: a failure
 * leaves the field undefined and never throws.
 */
export async function correlate(
  tx: FailedContractCallTx,
  diagnosis: Diagnosis,
  history: HistoryLoader | undefined
): Promise<Correlations> {
  const related: Correlations = {};
  if (!history) return related;

  const tasks: Promise<void>[] = [];

  if (history.senderTransactions) {
    tasks.push(
      history
        .senderTransactions(tx.sender_address, 20)
        .then(list => {
          const later = list.filter(
            (t: AddressTxSummary) =>
              t.tx_status === 'success' &&
              t.contract_id === tx.contract_call.contract_id &&
              t.function_name === tx.contract_call.function_name &&
              (t.block_height ?? 0) > tx.block_height
          );
          if (!later.length) return;
          const mine = argsRepr(tx);
          // Prefer a true retry (same inputs); otherwise report the later call honestly as different.
          const exact = later.find(t => sameArgs(t.function_args_repr, mine) === true);
          const pick = exact ?? later[0];
          related.retriedSuccessfullyIn = pick.tx_id;
          related.retryUsedSameArgs = sameArgs(pick.function_args_repr, mine);
        })
        .catch(() => undefined)
    );
  }

  const pc = diagnosis.postCondition;
  if (history.addressTxCount && pc?.problem === 'principal_mismatch' && pc.principal) {
    tasks.push(
      history
        .addressTxCount(pc.principal)
        .then(n => {
          related.pcPrincipalTxCount = n;
        })
        .catch(() => undefined)
    );
  }

  const wantsBalance =
    diagnosis.errorCode?.nativeFunction ||
    diagnosis.evidence.some(e => e.id === 'tag' && e.value === 'insufficient');
  if (history.ftBalanceAt && wantsBalance && tx.block_height > 0) {
    tasks.push(
      history
        .ftBalanceAt(tx.sender_address, 'STX', tx.block_height - 1)
        .then(balance => {
          if (balance != null) related.balanceAtParent = { asset: 'STX', balance };
        })
        .catch(() => undefined)
    );
  }

  await Promise.all(tasks);
  return related;
}
