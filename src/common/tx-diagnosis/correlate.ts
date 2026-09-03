import type { Correlations, Diagnosis, FailedContractCallTx, HistoryLoader } from './types';

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
          const later = list.find(
            t =>
              t.tx_status === 'success' &&
              t.contract_id === tx.contract_call.contract_id &&
              t.function_name === tx.contract_call.function_name &&
              (t.block_height ?? 0) > tx.block_height
          );
          if (later) related.retriedSuccessfullyIn = later.tx_id;
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
