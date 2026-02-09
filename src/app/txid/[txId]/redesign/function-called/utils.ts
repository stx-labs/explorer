import { Singleton } from '@/common/types/utils';
import { microToStacksFormatted } from '@/common/utils/utils';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
} from '@stacks/stacks-blockchain-api-types';
import { cvToJSON, hexToCV } from '@stacks/transactions';

const formatClarityValueType = (type: string) => {
  // TODO: add tests for this
  if (type === 'bool' || type === 'int' || type === 'principal' || type === 'uint') {
    switch (type) {
      case 'bool':
        return 'Boolean';
      case 'int':
        return 'Integer';
      case 'principal':
        return 'Principal';
      case 'uint':
        return 'Unsigned Integer';
    }
  }

  if (type.includes('tuple')) {
    return 'Tuple';
  }
  return type;
};

const tupleToArr = (
  tuple: string // TODO: add tests for this
) => {
  return tuple
    .replace('(tuple (', '')
    .replace('))', '')
    .split(') (')
    .map(item => item.split(' '));
};

function formatTupleResult(tuple: string) {
  // TODO: add tests for this
  const tupleArr = tupleToArr(tuple);
  let result = '';
  tupleArr.forEach((entry: any, index: number) => {
    if (entry && entry.length) {
      const key = entry?.[0]?.replace(/\(/g, '');
      const value = entry?.[1]?.replace(/\)/g, '');
      result += `${key}: ${value}`;

      if (index !== tuple.length - 1) {
        result += ', ';
      }
    }
  });

  return result;
}

export function formatFunctionArg(arg: ContractCallTxFunctionArg) {
  return formatClarityValue(arg);
}

type ClarityValue = {
  // TODO: This invented type does not seem well typed
  type: string;
  repr: string | number;
  name?: string;
  hex?: string;
};

// TODO: add tests for this
// I extracted this monstrosity from the old logic in FunctionSummaryClarityValue, which didn't have any type safety checks
// wrap this function in a try catch
export function formatClarityValue(cv: ClarityValue): FormattedClarityValue {
  let value: string | number = cv.repr;
  if (cv.type === 'principal') {
    const principal: string = cv.hex ? (cvToJSON(hexToCV(cv.hex)) || {}).value : '';
    const isContract = principal.includes('.');
    // remove the extra single quote from repr
    value = isContract ? principal : principal || cv.repr.toString().replace(/^'/, '');
  }
  if (cv.type === 'uint' && typeof cv.repr === 'string') {
    value = cv.repr.replace('u', '');
    if (cv.name?.includes('ustx')) {
      value = microToStacksFormatted(value);
    }
    value = value.toLocaleString();
  }
  if (cv.type.includes('tuple') && typeof cv.repr === 'string') {
    value = formatTupleResult(cv.repr);
  }

  return {
    name: cv.name || '',
    value: value.toString(),
    type: formatClarityValueType(cv.type),
  };
}

type ContractCallTxFunctionArg = Singleton<
  Required<Required<ContractCallTransaction['contract_call']>['function_args']>
>;

type ContractCallTxResult = ContractCallTransaction['tx_result'];

export interface FormattedClarityValue {
  name: string;
  value: string;
  type: string;
}

export interface FormattedFunctionResult {
  success: boolean;
  type: string;
  value: string;
}

interface ReprValueProps {
  type: string;
  value: string | number | (string | number)[];
}

// TODO: Function name isn't descriptive and types are opaque
const getReprValue = ({ type, value }: ReprValueProps) => {
  let reprValue = value ?? 'none';
  if (type.includes('list') && Array.isArray(value)) {
    reprValue = value.map((listEntry: any) => listEntry.value).join(', ');
  }
  return typeof reprValue === 'object' ? JSON.stringify(reprValue) : reprValue;
};

// TODO: add tests for this
export function formatFunctionResult(result: ContractCallTxResult): FormattedClarityValue[] {
  const { success, type, value } = cvToJSON(hexToCV(result.hex)); // TODO: what type are we handling here?
  if (type?.includes('tuple')) {
    const formattedResult = Object.keys(value.value).map((name: string) => {
      const isNestedType = Object.keys(value.value).includes('type');
      const entry = isNestedType ? value.value : value.value[name];
      const repr = getReprValue(entry);
      const clarityValue = formatClarityValue({
        type: entry.type,
        repr,
        name,
      });
      return clarityValue;
    });
    return formattedResult;
  } else {
    const formattedResult = formatClarityValue({
      type: type.replace('UnknownType', '').trim(),
      repr: result.repr,
    });
    return [formattedResult];
  }
}

export function getContractCallTxFunctionArgs(
  tx: ContractCallTransaction | MempoolContractCallTransaction
): ContractCallTxFunctionArg[] {
  const args = (tx?.contract_call?.function_args || []).filter(arg => !!arg);
  return args;
}

export function getFunctionResultSuccessStatus(tx: ContractCallTransaction) {
  const result = tx.tx_result;
  const { success } = cvToJSON(hexToCV(result.hex));
  return success;
}
