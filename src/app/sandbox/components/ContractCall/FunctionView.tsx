'use client';

import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';
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
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { showFn } from '../../../../common/utils/sandbox';
import { Switch } from '../../../../components/ui/switch';
import { Button } from '../../../../ui/Button';
import { Text } from '../../../../ui/Text';
import { Tooltip } from '../../../../ui/Tooltip';
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

        if (fn.access === 'public') {
          await callContract({
            contract: contractId,
            functionName: fn.name,
            functionArgs: Object.values(final),
            network: network.mode,
            postConditions:
              postConditionMode === PostConditionMode.Allow
                ? undefined
                : getPostCondition({
                    postConditionType,
                    postConditionAddress,
                    postConditionConditionCode,
                    postConditionAmount,
                    postConditionAssetAddress,
                    postConditionAssetContractName,
                    postConditionAssetName,
                  }),
            postConditionMode: postConditionMode === PostConditionMode.Allow ? 'allow' : 'deny',
          });
          void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite'] });
        } else {
          setReadonlyValue(Object.values(final));
        }
      }}
    >
      {({ handleSubmit, handleChange, values, errors, setFieldValue }) => {
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
                    <Flex justifyContent="flex-end" alignItems="center" gap={2}>
                      <Text fontSize="sm">
                        {values.postConditionMode === PostConditionMode.Deny
                          ? 'Deny Mode'
                          : 'Allow Mode'}
                      </Text>
                      <Switch
                        variant="redesignPrimary"
                        size="small"
                        id="post-condition-mode"
                        disabled={isReadOnly}
                        onChange={() => {
                          setFieldValue(
                            'postConditionMode',
                            values.postConditionMode === PostConditionMode.Deny
                              ? PostConditionMode.Allow
                              : PostConditionMode.Deny
                          );
                        }}
                        checked={values.postConditionMode === PostConditionMode.Allow}
                      />
                      <Tooltip content="Allow mode is less secure than Deny mode. Allow mode permits asset transfers that are not covered by post conditions. In Deny mode no other asset transfers are permitted besides those named in the post conditions">
                        <Icon h={5} w={5}>
                          <Info />
                        </Icon>
                      </Tooltip>
                    </Flex>
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
