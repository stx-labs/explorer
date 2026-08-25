'use client';

import { Box, Flex, Stack } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikErrors } from 'formik';
import { ChangeEvent, FC, ReactNode, useMemo, useState } from 'react';

import { asciiToBytes, bytesToHex } from '@stacks/common';
import {
  ClarityAbiFunction,
  ClarityValue,
  PostConditionMode,
  encodeAbiClarityValue,
  isClarityAbiList,
  isClarityAbiOptional,
  listCV,
} from '@stacks/transactions';

import { Section } from '../../../../common/components/Section';
import { Select } from '../../../../common/components/Select';
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { logError } from '../../../../common/utils/error-utils';
import { getConnectNetworkString } from '../../../../common/utils/network-utils';
import {
  postConditionModeDescriptions,
  postConditionModeFromName,
  postConditionModeNames,
  postConditionModeOptions,
} from '../../../../common/utils/post-condition-mode-utils';
import { showFn } from '../../../../common/utils/sandbox';
import { Alert } from '../../../../components/ui/alert';
import { Button } from '../../../../ui/Button';
import { Text } from '../../../../ui/Text';
import { ListValueType, NonTupleValueType, TupleValueType, ValueType } from '../../types/values';
import { encodeOptional, encodeOptionalTuple, encodeTuple, getTuple } from '../../utils';
import { callContract } from '../../utils/walletTransactions';
import { Argument } from '../Argument';
import {
  PostConditionForm,
  PostConditionParameters,
  checkFunctionParameters,
  checkPostConditionParameters,
  getPostCondition,
  isPostConditionParameter,
} from './PostConditionForm';
import { ReadOnlyField } from './ReadOnlyField';

interface FunctionViewProps {
  fn: ClarityAbiFunction;
  contractId: string;
  cancelButton: ReactNode;
}

interface FormType {
  [key: string]: ValueType | ListValueType;
}

export type FormikHandleChangeFunction = {
  (e: ChangeEvent<any>): void;
  <T = string | ChangeEvent<any>>(
    field: T
  ): T extends ChangeEvent<any> ? void : (e: string | ChangeEvent<any>) => void;
};

export type FormikSetFieldValueFunction = (
  field: string,
  value: any,
  shouldValidate?: boolean
) => Promise<void | FormikErrors<FunctionFormikState>>;

export type FunctionFormikState = FormType & PostConditionParameters;

export const FunctionView: FC<FunctionViewProps> = ({ fn, contractId, cancelButton }) => {
  const [readOnlyValue, setReadonlyValue] = useState<ClarityValue[]>();
  const network = useGlobalContext().activeNetwork;
  const queryClient = useQueryClient();
  const isReadOnly = fn.access === 'read_only';

  const initialPostConditionParameterValues: PostConditionParameters = {
    postConditionMode: isReadOnly ? PostConditionMode.Allow : PostConditionMode.Deny,
    postConditionType: undefined,
    postConditionAddress: undefined,
    postConditionAmount: undefined,
    postConditionConditionCode: undefined,
    postConditionAssetName: undefined,
    postConditionAssetAddress: undefined,
    postConditionAssetContractName: undefined,
  };

  const initialFunctionParameterValues = useMemo(
    () =>
      fn.args.reduce((argsAcc, arg) => {
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
      }, {} as FormType),
    [fn]
  );

  if (!showFn(contractId, fn)) {
    return (
      <Section
        overflowY="auto"
        flexGrow={1}
        title={`${fn.name} (${fn.access} function)`}
        borderRadius={'0'}
      >
        <Box p="32px">
          <Stack>
            <Text>Invalid function for {contractId}.</Text>
            {cancelButton}
          </Stack>
        </Box>
      </Section>
    );
  }

  return (
    <Formik
      initialValues={
        {
          ...initialFunctionParameterValues,
          ...initialPostConditionParameterValues,
        } as FunctionFormikState
      }
      validateOnChange={false}
      validateOnBlur={false}
      validate={values => {
        const functionParametersErrors = checkFunctionParameters(fn, values);
        const postConditionParametersErrors = checkPostConditionParameters(values);
        const errors = Object.assign({}, functionParametersErrors, postConditionParametersErrors);
        return errors;
      }}
      onSubmit={async values => {
        const final: Record<string, ClarityValue> = {};

        Object.keys(values).forEach(arg => {
          if (isPostConditionParameter(arg)) {
            return;
          }
          const type = fn.args.find(({ name }) => name === arg)?.type;
          if (!type) return;
          const tuple = getTuple(type);
          const isList = isClarityAbiList(type);
          const optionalType = isClarityAbiOptional(type) ? type?.optional : undefined;
          if (tuple) {
            if (optionalType) {
              final[arg] = encodeOptionalTuple(tuple, values[arg] as TupleValueType);
            } else {
              final[arg] = encodeTuple(tuple, values[arg] as TupleValueType);
            }
          } else if (isList) {
            const listValues = values[arg] as ListValueType;
            const listType = type.list.type;
            const optionalListType = isClarityAbiOptional(listType)
              ? listType?.optional
              : undefined;
            const listTuple = getTuple(listType);
            const listData = listValues.map(listValue =>
              listTuple
                ? encodeTuple(listTuple, listValue as TupleValueType)
                : encodeAbiClarityValue(
                    (listValue as NonTupleValueType).toString(),
                    optionalListType || listType
                  )
            );
            final[arg] = listCV(listData);
          } else if (optionalType) {
            const val =
              arg === 'memo'
                ? bytesToHex(asciiToBytes((values[arg] as NonTupleValueType).toString()))
                : values[arg];
            final[arg] = encodeOptional(optionalType, val.toString());
          } else {
            final[arg] = encodeAbiClarityValue((values[arg] as NonTupleValueType).toString(), type);
          }
        });

        const {
          postConditionMode,
          postConditionType,
          postConditionAddress,
          postConditionConditionCode,
          postConditionAmount,
          postConditionAssetAddress,
          postConditionAssetContractName,
          postConditionAssetName,
        } = values;

        // Resolved once: two consumers below read this, and an undefined mode
        // must not let one attach post-conditions while the other sends 'allow'
        const submittedPostConditionMode = postConditionMode ?? PostConditionMode.Deny;

        if (fn.access === 'public') {
          try {
            await callContract({
              contract: contractId,
              functionName: fn.name,
              functionArgs: Object.values(final),
              network: getConnectNetworkString(network),
              postConditions:
                submittedPostConditionMode === PostConditionMode.Allow
                  ? undefined
                  : postConditionType == null
                    ? []
                    : getPostCondition({
                        postConditionType,
                        postConditionAddress,
                        postConditionConditionCode,
                        postConditionAmount,
                        postConditionAssetAddress,
                        postConditionAssetContractName,
                        postConditionAssetName,
                      }),
              postConditionMode: postConditionModeNames[submittedPostConditionMode],
            });
            void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite'] });
          } catch (error) {
            logError(error as Error, 'Error submitting sandbox contract call', {
              contractId,
              functionName: fn.name,
            });
          }
        } else {
          setReadonlyValue(Object.values(final));
        }
      }}
    >
      {({ handleSubmit, handleChange, values, errors, setFieldValue }) => {
        const postConditionMode = values.postConditionMode ?? PostConditionMode.Allow;
        return (
          <Section
            overflowY="visible"
            flexGrow={1}
            title={`${fn.name} (${fn.access} function)`}
            borderRadius={'0'}
          >
            {readOnlyValue ? (
              <ReadOnlyField
                fn={fn}
                readOnlyValue={readOnlyValue}
                contractId={contractId}
                cancelButton={cancelButton}
              />
            ) : (
              <Box p={4}>
                <Form onSubmit={handleSubmit}>
                  <Stack gap={4}>
                    {!isReadOnly && (
                      <Stack gap={3}>
                        <Flex justifyContent="flex-end" alignItems="center" gap={2} flexWrap="wrap">
                          <Text fontSize="sm">Post-conditions:</Text>
                          <Select
                            defaultValue={[postConditionModeNames[postConditionMode]]}
                            items={postConditionModeOptions}
                            label="Post-condition mode"
                            onValueChange={details => {
                              const mode = postConditionModeFromName(details.value[0]);
                              if (mode == null) return;
                              setFieldValue('postConditionMode', mode);
                            }}
                            size="sm"
                          />
                        </Flex>
                        <Alert
                          status="neutral"
                          description={postConditionModeDescriptions[postConditionMode]}
                        />
                      </Stack>
                    )}
                    {fn.args.length && (
                      <>
                        {fn.args.map(({ name, type }) => (
                          <Argument
                            handleChange={handleChange}
                            name={name}
                            type={type}
                            error={errors[name]}
                            key={name}
                            value={values[name]}
                          />
                        ))}
                      </>
                    )}
                    {fn.access === 'public' && (
                      <PostConditionForm
                        values={values}
                        errors={errors}
                        formikSetFieldValue={setFieldValue}
                        handleChange={handleChange}
                      />
                    )}
                    <Stack alignItems="center" justifyContent="center">
                      <Button
                        type="submit"
                        onClick={e => {
                          e.preventDefault();
                          handleSubmit();
                        }}
                      >
                        Call function
                      </Button>
                      {cancelButton}
                    </Stack>
                  </Stack>
                </Form>
              </Box>
            )}
          </Section>
        );
      }}
    </Formik>
  );
};
