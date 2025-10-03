'use client';

import { ListValueType, ValueType } from '@/app/sandbox/types/values';
import { Select } from '@/common/components/Select';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { logError } from '@/common/utils/error-utils';
import { InvalidFunctionType, getInvalidFunctionType, showFn } from '@/common/utils/sandbox';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikErrors } from 'formik';
import { FC, useMemo, useState } from 'react';

import { ClarityAbiFunction, ClarityValue, PostConditionMode } from '@stacks/transactions';

import { Alert } from '../Alert';
import { Argument } from './Argument';
import { PostConditionForm } from './PostConditionForm';
import { ReadOnlyField } from './ReadOnlyField';
import {
  checkFunctionParameters,
  createInitialFunctionParameterValues,
  extractFunctionParams,
  handlePublicFunctionCall,
  isPublicFunction,
  processFunctionParameters,
} from './function-call-function-params-utils';
import {
  PostConditionParameters,
  checkPostConditionParameters,
  extractPostConditionParams,
  initialPostConditionParameterValues,
} from './function-call-post-condition-params-utils';

interface FunctionCallFormProps {
  fnAbi: ClarityAbiFunction;
  contractId: string;
  handleCancel?: () => void;
}

export interface FunctionParameters {
  [key: string]: ValueType | ListValueType;
}

export type FormikSetFieldValueFunction = (
  field: string,
  value: string | number,
  shouldValidate?: boolean
) => Promise<void | FormikErrors<FunctionFormikState>>;

export type FunctionFormikState = FunctionParameters & PostConditionParameters;

export const FunctionCallForm: FC<FunctionCallFormProps> = ({
  contractId,
  fnAbi,
  handleCancel,
}) => {
  const queryClient = useQueryClient();
  const network = useGlobalContext().activeNetwork;
  const [readOnlyValue, setReadonlyValue] = useState<ClarityValue[]>();
  const canUsePostConditions = fnAbi.access === 'public';

  const initialFunctionParameterValues = useMemo(
    () => createInitialFunctionParameterValues(fnAbi),
    [fnAbi]
  );

  if (!showFn(contractId, fnAbi)) {
    const invalidFunctionType = getInvalidFunctionType(contractId, fnAbi);
    return (
      <Alert
        title="Invalid function"
        description={
          invalidFunctionType === InvalidFunctionType.Private
            ? 'This function is private.'
            : 'This function is not valid.'
        }
        status="error"
      />
    );
  }

  if (readOnlyValue) {
    return (
      <ReadOnlyField
        fn={fnAbi}
        readOnlyValue={readOnlyValue}
        contractId={contractId}
        handleCancel={handleCancel}
      />
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
        const functionParams = extractFunctionParams(values);
        const functionParametersErrors = checkFunctionParameters(fnAbi, functionParams);
        const postConditionParams = extractPostConditionParams(values);
        const postConditionParametersErrors = checkPostConditionParameters(postConditionParams);
        const errors = Object.assign({}, functionParametersErrors, postConditionParametersErrors);
        return errors;
      }}
      onSubmit={async values => {
        try {
          const functionParams = extractFunctionParams(values);
          const postConditionParams = extractPostConditionParams(values);
          const processedFunctionParams = processFunctionParameters(functionParams, fnAbi);

          if (isPublicFunction(fnAbi)) {
            await handlePublicFunctionCall(processedFunctionParams, postConditionParams, {
              contractId,
              fnAbi,
              network,
              queryClient,
            });
          } else {
            setReadonlyValue(Object.values(processedFunctionParams));
          }
        } catch (error) {
          logError(new Error(error as string), 'Error submitting function call form', {
            values,
            fnAbi,
            contractId,
            network,
          });
        }
      }}
    >
      {({ handleSubmit, handleChange, values, errors, setFieldValue }) => {
        return (
          <Stack gap={6}>
            {canUsePostConditions && (
              <Stack gap={3}>
                <Flex alignItems="center" gap={2}>
                  <Text textStyle="text-regular-sm" color="textSecondary">
                    Post-conditions:
                  </Text>
                  <Select
                    defaultValue={['allow']}
                    items={[
                      {
                        value: 'allow',
                        label: 'Allow mode',
                      },
                      {
                        value: 'deny',
                        label: 'Deny mode',
                      },
                    ]}
                    onValueChange={details => {
                      const postConditionMode =
                        details.value[0] === 'allow'
                          ? PostConditionMode.Allow
                          : PostConditionMode.Deny;
                      setFieldValue('postConditionMode', postConditionMode);
                    }}
                    size="sm"
                  />
                </Flex>
                <Alert
                  status="neutral"
                  description={`In the context of post-conditions, \"allow mode\" and \"deny mode\" determine how transactions are processed when they don't exactly match the specified post-conditions. Allow mode permits transactions that satisfy the post-condition criteria, while deny mode restricts transactions to only the criteria explicitly listed in the post-conditions; anything not listed will cause the transaction to fail. Learn more about post-conditions.`}
                />
              </Stack>
            )}
            <Form onSubmit={handleSubmit}>
              <Stack gap={4}>
                {fnAbi.args.length && (
                  <>
                    {fnAbi.args.map(({ name, type }) => (
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
                {canUsePostConditions && (
                  <PostConditionForm
                    values={values}
                    errors={errors}
                    formikSetFieldValue={setFieldValue}
                    handleChange={handleChange}
                  />
                )}
                <Flex alignItems="center" gap={3}>
                  <Button
                    variant="redesignPrimary"
                    size="small"
                    type="submit"
                    onClick={e => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    Call function
                  </Button>
                  {handleCancel && (
                    <Button
                      variant="redesignTertiary"
                      size="small"
                      onClick={e => {
                        e.preventDefault();
                        handleCancel();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Flex>
              </Stack>
            </Form>
          </Stack>
        );
      }}
    </Formik>
  );
};
