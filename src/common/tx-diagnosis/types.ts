import type {
  ContractCallTransaction,
  MempoolTransaction,
  PostCondition,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

/** Bump when copy or classification changes so cached context packs are invalidated. */
export const ENGINE_VERSION = '1';

/**
 * `dropped` and `deploy_failure` are reserved: the engine never emits them yet, but consumers should
 * treat any unknown class as "render nothing and keep today's alert".
 */
export type FailureClass =
  | 'contract_error'
  | 'runtime_panic'
  | 'analysis_error'
  | 'post_condition'
  | 'post_condition_masked_error'
  | 'dropped'
  | 'deploy_failure';

export type Confidence = 'high' | 'medium' | 'low';

export type DetailKind =
  | 'address'
  | 'contract'
  | 'function'
  | 'tx'
  | 'constant'
  | 'value'
  | 'asset';

/** A technical identifier rendered as a copyable chip: shown as `label`, copied as `value`. */
export interface DetailRef {
  kind: DetailKind;
  label: string;
  value: string;
  href?: string;
}

export type RichPart = string | DetailRef;

export interface Fact {
  parts: RichPart[];
  link?: { label: string; href: string };
  chips?: DetailRef[];
}

export interface Evidence {
  id: string;
  label: string;
  value: string;
  href?: string;
}

export interface SourceRef {
  contractId: string;
  functionName?: string;
  lines: { n: number; code: string }[];
  failingLine?: number;
  note?: string;
}

export interface ErrorCodeInfo {
  /** As written in the result, e.g. `u2003`, or the full repr for non-uint errors. */
  code: string;
  name?: string;
  definedIn?: string;
  definitionLine?: number;
  usageLines?: number[];
  comments?: string[];
  /** Set when the code matches a Clarity built-in (stx-transfer?, ft-transfer?, …). */
  nativeFunction?: string;
  nativeMeaning?: string;
  /** True when the called function takes trait arguments (callee chosen at runtime). */
  dynamicDispatch: boolean;
  candidatesTried: string[];
}

export type PostConditionProblem =
  | 'principal_mismatch'
  | 'asset_unchecked'
  | 'amount_not_met'
  | 'nft'
  | 'unknown';

export interface PostConditionFinding {
  problem: PostConditionProblem;
  /** Index into `tx.post_conditions` when a specific condition is implicated. */
  index?: number;
  asset?: string;
  /** Principal named by the post-condition (resolved to an address / contract id). */
  principal?: string;
  /** Principal that actually moved the asset (from vm_error). */
  movedBy?: string;
  expected?: string;
  actual?: string;
  conditionCode?: string;
}

export interface RuntimeFinding {
  variant: string;
  detail?: string;
  /** Contracts the failing function may have reached (in-contract helpers followed). */
  calleeCandidates: string[];
  /** Line numbers of candidate sites in the called contract, when exactly one kind of site exists. */
  candidateLines: number[];
}

export interface Correlations {
  retriedSuccessfullyIn?: string;
  pcPrincipalTxCount?: number;
  balanceAtParent?: { asset: string; balance: string };
}

export interface Diagnosis {
  engineVersion: string;
  txId: string;
  class: FailureClass;
  subkind: string;
  confidence: Confidence;
  headline: string;
  senderAction: string;
  invariant: string;
  whatHappened: Fact[];
  developerNote?: RichPart[];
  evidence: Evidence[];
  errorCode?: ErrorCodeInfo;
  postCondition?: PostConditionFinding;
  runtime?: RuntimeFinding;
  source?: SourceRef;
  args: { name: string; value: string; type: string }[];
  related: Correlations;
  raw: { vmError: string | null; txResult: { repr: string; hex: string } | null };
}

/** Minimal contract shape the engine needs (subset of the API's SmartContract). */
export interface ContractInfo {
  contract_id: string;
  source_code: string;
}

export type ContractLoader = (contractId: string) => Promise<ContractInfo | null>;

export interface AddressTxSummary {
  tx_id: string;
  tx_status: string;
  block_height?: number;
  contract_id?: string;
  function_name?: string;
}

export interface HistoryLoader {
  senderTransactions?: (sender: string, limit: number) => Promise<AddressTxSummary[]>;
  addressTxCount?: (address: string) => Promise<number>;
  ftBalanceAt?: (address: string, assetId: string, blockHeight: number) => Promise<string | null>;
}

/** The API returns `vm_error` on failed txs but the published types omit it. */
export type FailedContractCallTx = ContractCallTransaction & {
  tx_status: 'abort_by_response' | 'abort_by_post_condition';
  vm_error?: string | null;
};

export function isFailedContractCall(
  tx: Transaction | MempoolTransaction | undefined | null
): tx is FailedContractCallTx {
  return (
    !!tx &&
    tx.tx_type === 'contract_call' &&
    (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition')
  );
}

export type AnyPostCondition = PostCondition;

/** Resolve a post-condition principal to an address or contract id. */
export function resolvePostConditionPrincipal(
  principal: PostCondition['principal'],
  sender: string
): string {
  switch (principal.type_id) {
    case 'principal_origin':
      return sender;
    case 'principal_standard':
      return principal.address;
    case 'principal_contract':
      return `${principal.address}.${principal.contract_name}`;
    default:
      return sender;
  }
}

/** Asset identifier as stacks-core prints it: `<address>.<contract>::<asset>`; STX has no contract. */
export function postConditionAssetId(pc: PostCondition): string {
  if (pc.type === 'stx') return 'STX';
  return `${pc.asset.contract_address}.${pc.asset.contract_name}::${pc.asset.asset_name}`;
}
