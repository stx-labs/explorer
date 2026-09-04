import { type Diagnosis, type FailedContractCallTx, contractName } from '@/common/tx-diagnosis';

export function buildContextPackPath(txId: string, chain?: string): string {
  const params = new URLSearchParams();
  if (chain) params.set('chain', chain);
  const query = params.toString();
  return `/txid/${txId}/context.md${query ? `?${query}` : ''}`;
}

export function postConditionSummary(tx: FailedContractCallTx, diagnosis: Diagnosis): string {
  const count = tx.post_conditions?.length ?? 0;
  const finding = diagnosis.postCondition;
  if (finding?.index !== undefined) {
    return `#${finding.index + 1} of ${count} · ${finding.problem.replace(/_/g, ' ')}`;
  }
  if (finding?.candidates?.length) {
    return `one of #${finding.candidates.map(index => index + 1).join(', #')} · ${finding.problem.replace(/_/g, ' ')}`;
  }
  if (count) return `${count} in ${tx.post_condition_mode} mode · not reached`;
  return `${tx.post_condition_mode} mode · none set`;
}

export function sourceSummary(
  source: NonNullable<Diagnosis['source']>,
  calledContractId: string
): string {
  const parts: string[] = [];
  if (source.contractId !== calledContractId) parts.push(contractName(source.contractId));
  if (source.functionName) parts.push(source.functionName);
  if (source.failingLine) parts.push(`line ${source.failingLine}`);
  return parts.join(' · ');
}
