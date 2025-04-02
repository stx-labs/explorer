import {
  ListValueType,
  NonTupleValueType,
  TupleValueType,
  isListValueType,
  isNonTupleValueType,
  isTupleValueType,
} from '@/app/sandbox/types/values';
import { encodeOptional, encodeOptionalTuple, encodeTuple, getTuple } from '@/app/sandbox/utils';
import { CONNECT_AUTH_ORIGIN } from '@/common/constants/env';
import { isUint128 } from '@/common/utils/number-utils';
import { getContractIdParts } from '@/common/utils/test-utils/contract-utils';
import { QueryClient } from '@tanstack/react-query';

import { asciiToBytes, bytesToHex } from '@stacks/common';
import { openContractCall } from '@stacks/connect';
import {
  ClarityAbiFunction,
  ClarityAbiType,
  ClarityAbiTypeList,
  ClarityValue,
  PostConditionMode,
  encodeAbiClarityValue,
  isClarityAbiList,
  isClarityAbiOptional,
  isClarityAbiPrimitive,
  listCV,
  validateStacksAddress,
} from '@stacks/transactions';

import { FunctionFormikState, FunctionParameters } from './FunctionCallForm';
import {
  PostConditionParameters,
  getPostCondition,
  isPostConditionParameter,
} from './function-call-post-condition-params-utils';

export function processFunctionParameters(
  functionParameters: FunctionParameters,
  fnAbi: ClarityAbiFunction
): Record<string, ClarityValue> {
  const final: Record<string, ClarityValue> = {};

  Object.keys(functionParameters).forEach(arg => {
    const type = fnAbi.args.find(({ name }) => name === arg)?.type;
    if (!type) return;

    const tuple = getTuple(type);
    const isList = isClarityAbiList(type);
    const optionalType = isClarityAbiOptional(type) ? type?.optional : undefined;

    if (tuple && isTupleValueType(functionParameters[arg])) {
      final[arg] = optionalType
        ? encodeOptionalTuple(tuple, functionParameters[arg])
        : encodeTuple(tuple, functionParameters[arg]);
    } else if (isList && isListValueType(functionParameters[arg])) {
      final[arg] = processListValue(functionParameters[arg], type);
    } else if (optionalType && isNonTupleValueType(functionParameters[arg])) {
      final[arg] = processOptionalValue(arg, functionParameters[arg], optionalType);
    } else {
      final[arg] = encodeAbiClarityValue(functionParameters[arg].toString(), type);
    }
  });

  return final;
}

export function processListValue(
  listValues: ListValueType,
  type: ClarityAbiTypeList
): ClarityValue {
  const listType = type.list.type;
  const optionalListType = isClarityAbiOptional(listType) ? listType?.optional : undefined;
  const listTuple = getTuple(listType);

  const listData = listValues.map(listValue =>
    listTuple
      ? encodeTuple(listTuple, listValue as TupleValueType)
      : encodeAbiClarityValue(
          (listValue as NonTupleValueType).toString(),
          optionalListType || listType
        )
  );

  return listCV(listData);
}

export function processOptionalValue(
  arg: string,
  value: NonTupleValueType,
  optionalType: ClarityAbiType
): ClarityValue {
  const val = arg === 'memo' ? bytesToHex(asciiToBytes(value.toString())) : value;
  return encodeOptional(optionalType, val.toString());
}

export const isPublicFunction = (fnAbi: ClarityAbiFunction) => fnAbi.access === 'public';
export const shouldUsePostConditions = (mode: PostConditionMode) =>
  mode !== PostConditionMode.Allow;

export function extractFunctionParams(values: FunctionFormikState): FunctionParameters {
  const functionParams: FunctionParameters = {};

  Object.keys(values).forEach(key => {
    if (!isPostConditionParameter(key)) {
      functionParams[key] = values[key];
    }
  });

  return functionParams;
}

export interface ContractCallDependencies {
  contractId: string;
  fnAbi: ClarityAbiFunction;
  network: any;
  queryClient: QueryClient;
}

export async function handlePublicFunctionCall(
  final: Record<string, ClarityValue>,
  postConditionParams: PostConditionParameters,
  { contractId, fnAbi, network, queryClient }: ContractCallDependencies
): Promise<void> {
  const { contractAddress, contractName } = getContractIdParts(contractId);
  const postCondition = shouldUsePostConditions(postConditionParams.postConditionMode!)
    ? getPostCondition(postConditionParams)
    : undefined;
  await openContractCall({
    contractAddress,
    contractName,
    functionName: encodeURIComponent(fnAbi.name),
    functionArgs: Object.values(final),
    network: network,
    authOrigin: CONNECT_AUTH_ORIGIN,
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite'] });
    },
    postConditions: postCondition ? [postCondition] : undefined,
    postConditionMode: postConditionParams.postConditionMode,
  });
}

export function createInitialFunctionParameterValues(
  fnAbi: ClarityAbiFunction
): FunctionParameters {
  return fnAbi.args.reduce((argsAcc, arg) => {
    const tuple = getTuple(arg.type);
    const isList = isClarityAbiList(arg.type);
    argsAcc[arg.name] = !!tuple
      ? tuple.reduce(
          (tupleAcc, tupleEntry) => {
            tupleAcc[tupleEntry.name] = '';
            return tupleAcc;
          },
          {} as Record<string, string | number>
        )
      : isList
        ? []
        : '';
    return argsAcc;
  }, {} as FunctionParameters);
}

// Validates the function parameters
export const checkFunctionParameters = (fn: ClarityAbiFunction, values: FunctionParameters) => {
  const errors: Record<string, string> = {};

  Object.keys(values).forEach(arg => {
    const type = fn.args.find(({ name }) => name === arg)?.type;
    const isOptional = type && isClarityAbiOptional(type);
    const optionalTypeIsPrincipal =
      isOptional && isClarityAbiPrimitive(type.optional) && type.optional === 'principal';

    // If the argument is not optional and is not provided, add an error
    if (!isOptional && (values[arg] == null || values[arg] === '')) {
      errors[arg] = `${arg} is required`;
      return;
    }

    // Validate principal arguments
    if (type === 'principal' || (optionalTypeIsPrincipal && !!values[arg])) {
      const validPrincipal = validateStacksAddress(
        (values[arg] as NonTupleValueType).toString().split('.')[0]
      );
      if (!validPrincipal) {
        errors[arg] = 'Invalid Stacks address';
        return;
      }
    }

    // Validate uint128 arguments
    if (type === 'uint128' && !isUint128(values[arg] as number)) {
      errors[arg] = 'Invalid uint128 value';
      return;
    }
  });

  return errors;
};
