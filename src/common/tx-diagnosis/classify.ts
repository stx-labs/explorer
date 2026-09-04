/** Classifies a failed contract call from immutable transaction fields without fetching data. */
import type { PostCondition } from '@stacks/stacks-blockchain-api-types';

import {
  FailedContractCallTx,
  FailureClass,
  PostConditionFinding,
  postConditionAssetId,
  resolvePostConditionPrincipal,
} from './types';
import { ParsedVmError, apiConditionCodeFor, parseVmError } from './vm-error';

export interface Classification {
  class: FailureClass;
  subkind: string;
  /** `u2003` for uint codes; the full repr for other `(err …)` values. */
  errorCode?: string;
  errorCodeIsUint: boolean;
  resultRepr: string;
  resultIsErr: boolean;
  resultIsOk: boolean;
  vmError: ParsedVmError | null;
  postCondition?: PostConditionFinding;
}

const UINT_ERR = /^\(err\s+(u\d+)\)$/;
const ANY_ERR = /^\(err\s+([\s\S]+)\)$/;

/**
 * `(err none)` is what stacks-core substitutes when a call aborts with a runtime or analysis error
 * (`Value::err_none()`); it is only a contract's own return value when no `vm_error` accompanies it.
 */
function errCode(repr: string, hasVmError: boolean): { code: string; isUint: boolean } | null {
  const u = repr.match(UINT_ERR);
  if (u) return { code: u[1], isUint: true };
  if (repr === '(err none)' && hasVmError) return null;
  const a = repr.match(ANY_ERR);
  if (a) return { code: a[1].trim(), isUint: false };
  return null;
}

/** Whether a stacks-core asset identifier refers to STX (printed under the transient principal). */
function isStxAsset(asset: string): boolean {
  return asset === 'STX' || /\.STX::STX$/.test(asset);
}

function pcMatchesAsset(pc: PostCondition, asset: string): boolean {
  if (isStxAsset(asset)) return pc.type === 'stx';
  return pc.type !== 'stx' && postConditionAssetId(pc) === asset;
}

interface Row {
  pc: PostCondition;
  index: number;
}

/** One implicated row when exactly one matches; otherwise the candidate list and no index. */
function pickRow(rows: Row[]): { index?: number; candidates?: number[] } {
  if (rows.length === 1) return { index: rows[0].index };
  if (rows.length > 1) return { candidates: rows.map(r => r.index) };
  return {};
}

export function findPostCondition(
  tx: FailedContractCallTx,
  parsed: ParsedVmError
): PostConditionFinding {
  const sender = tx.sender_address;
  const rows: Row[] = (tx.post_conditions ?? []).map((pc, index) => ({ pc, index }));
  const principalOf = (pc: PostCondition) => resolvePostConditionPrincipal(pc.principal, sender);

  switch (parsed.kind) {
    case 'pc_ft_unchecked': {
      const movedBy = parsed.principal;
      const onAsset = rows.filter(({ pc }) => pcMatchesAsset(pc, parsed.asset));
      const others = onAsset.filter(({ pc }) => principalOf(pc) !== movedBy);
      if (movedBy === sender && others.length > 0) {
        const principals = Array.from(new Set(others.map(({ pc }) => principalOf(pc))));
        return {
          problem: 'principal_mismatch',
          ...pickRow(others),
          asset: parsed.asset,
          movedBy,
          principal: principals.length === 1 ? principals[0] : undefined,
          principals,
        };
      }
      if (onAsset.length === 0) {
        return { problem: 'asset_unchecked', asset: parsed.asset, movedBy };
      }
      return { problem: 'unknown', asset: parsed.asset, movedBy };
    }
    case 'pc_amount': {
      const code = apiConditionCodeFor(parsed.code);
      const base = rows.filter(
        ({ pc }) =>
          pcMatchesAsset(pc, parsed.asset) &&
          principalOf(pc) === parsed.principal &&
          pc.condition_code === code
      );
      // The vm_error's "expected" is the condition's own amount: use it to tell twin rows apart.
      const exact = base.filter(
        ({ pc }) => pc.type !== 'non_fungible' && String(pc.amount) === parsed.expected
      );
      return {
        problem: 'amount_not_met',
        ...pickRow(exact.length ? exact : base),
        asset: parsed.asset,
        principal: parsed.principal,
        expected: parsed.expected,
        actual: parsed.actual,
        conditionCode: parsed.code,
      };
    }
    case 'pc_nft_condition':
    case 'pc_nft_value_unchecked':
    case 'pc_nft_unchecked':
    case 'pc_nft_no_checks':
      return { problem: 'nft', asset: parsed.asset, principal: parsed.principal };
    case 'pc_stx_staked_amount':
      return {
        problem: 'stacking',
        principal: parsed.principal,
        expected: parsed.expected,
        actual: parsed.actual,
        conditionCode: parsed.code,
      };
    case 'pc_pox_action':
      return {
        problem: 'stacking',
        principal: parsed.principal,
        conditionCode: parsed.code,
        actual: parsed.performed,
      };
    case 'pc_stx_staked_unchecked':
      return { problem: 'stacking', principal: parsed.principal, actual: parsed.amount };
    case 'pc_pox_action_unchecked':
      return { problem: 'stacking', principal: parsed.principal };
    default:
      return { problem: 'unknown' };
  }
}

/**
 * Exact, synchronous classification from the transaction alone. Never needs the contract.
 */
export function classifyFailure(tx: FailedContractCallTx): Classification {
  const resultRepr = tx.tx_result?.repr ?? '';
  const vmError = parseVmError(tx.vm_error);
  const err = errCode(resultRepr, !!vmError);
  const resultIsErr = resultRepr.startsWith('(err');
  const resultIsOk = resultRepr.startsWith('(ok');
  const common = { errorCodeIsUint: false, resultRepr, resultIsErr, resultIsOk, vmError };

  if (tx.tx_status === 'abort_by_post_condition') {
    const finding = vmError ? findPostCondition(tx, vmError) : { problem: 'unknown' as const };
    if (err) {
      // The call itself failed; the post-condition only failed because nothing moved.
      return {
        ...common,
        class: 'post_condition_masked_error',
        subkind: err.isUint ? 'uint_code' : 'non_uint',
        errorCode: err.code,
        errorCodeIsUint: err.isUint,
        postCondition: finding,
      };
    }
    return { ...common, class: 'post_condition', subkind: finding.problem, postCondition: finding };
  }

  // abort_by_response
  if (err) {
    return {
      ...common,
      class: 'contract_error',
      subkind: err.isUint ? 'uint_code' : 'non_uint',
      errorCode: err.code,
      errorCodeIsUint: err.isUint,
    };
  }
  if (vmError?.kind === 'runtime') {
    return { ...common, class: 'runtime_panic', subkind: vmError.variant };
  }
  if (vmError?.kind === 'analysis') {
    return { ...common, class: 'analysis_error', subkind: vmError.message.split('(')[0].trim() };
  }
  // Anything else (an unrecognised string, or no vm_error at all) is reported as unknown, never
  // dressed up as an app bug or a type error.
  return {
    ...common,
    class: 'unknown_vm_error',
    subkind: vmError ? 'unrecognised' : 'no_vm_error',
  };
}
