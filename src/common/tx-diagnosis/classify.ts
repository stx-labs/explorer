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

export function findPostCondition(
  tx: FailedContractCallTx,
  parsed: ParsedVmError
): PostConditionFinding {
  const sender = tx.sender_address;
  const pcs = tx.post_conditions ?? [];

  switch (parsed.kind) {
    case 'pc_ft_unchecked': {
      const movedBy = parsed.principal;
      const onAsset = pcs
        .map((pc, index) => ({ pc, index }))
        .filter(({ pc }) => pcMatchesAsset(pc, parsed.asset));
      const other = onAsset.find(
        ({ pc }) => resolvePostConditionPrincipal(pc.principal, sender) !== movedBy
      );
      if (movedBy === sender && onAsset.length > 0 && other) {
        return {
          problem: 'principal_mismatch',
          index: other.index,
          asset: parsed.asset,
          movedBy,
          principal: resolvePostConditionPrincipal(other.pc.principal, sender),
        };
      }
      if (onAsset.length === 0) {
        return { problem: 'asset_unchecked', asset: parsed.asset, movedBy };
      }
      return { problem: 'unknown', asset: parsed.asset, movedBy };
    }
    case 'pc_amount': {
      const code = apiConditionCodeFor(parsed.code);
      const idx = pcs.findIndex(
        pc =>
          pcMatchesAsset(pc, parsed.asset) &&
          resolvePostConditionPrincipal(pc.principal, sender) === parsed.principal &&
          pc.condition_code === code
      );
      return {
        problem: 'amount_not_met',
        index: idx >= 0 ? idx : undefined,
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

  if (tx.tx_status === 'abort_by_post_condition') {
    const finding = vmError ? findPostCondition(tx, vmError) : { problem: 'unknown' as const };
    if (err) {
      // The call itself failed; the post-condition only failed because nothing moved.
      return {
        class: 'post_condition_masked_error',
        subkind: err!.isUint ? 'uint_code' : 'non_uint',
        errorCode: err!.code,
        errorCodeIsUint: err!.isUint,
        resultRepr,
        resultIsErr,
        resultIsOk,
        vmError,
        postCondition: finding,
      };
    }
    return {
      class: 'post_condition',
      subkind: finding.problem,
      errorCodeIsUint: false,
      resultRepr,
      resultIsErr,
      resultIsOk,
      vmError,
      postCondition: finding,
    };
  }

  // abort_by_response
  if (err) {
    return {
      class: 'contract_error',
      subkind: err.isUint ? 'uint_code' : 'non_uint',
      errorCode: err.code,
      errorCodeIsUint: err.isUint,
      resultRepr,
      resultIsErr,
      resultIsOk,
      vmError,
    };
  }
  if (vmError?.kind === 'runtime') {
    return {
      class: 'runtime_panic',
      subkind: vmError.variant,
      errorCodeIsUint: false,
      resultRepr,
      resultIsErr,
      resultIsOk,
      vmError,
    };
  }
  if (vmError) {
    return {
      class: 'analysis_error',
      subkind: vmError.kind === 'analysis' ? vmError.message.split('(')[0].trim() : 'unknown',
      errorCodeIsUint: false,
      resultRepr,
      resultIsErr,
      resultIsOk,
      vmError,
    };
  }
  return {
    class: 'runtime_panic',
    subkind: 'unknown',
    errorCodeIsUint: false,
    resultRepr,
    resultIsErr,
    resultIsOk,
    vmError: null,
  };
}
