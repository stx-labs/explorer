import { Select } from '@/common/components/Select';
import { Button } from '@/ui/Button';
import { Box, Flex, Stack, chakra } from '@chakra-ui/react';
import { Field, FieldArray, FormikErrors } from 'formik';

import {
  AssetString,
  Cl,
  ClarityAbiFunction,
  FungibleComparator,
  FungibleConditionCode,
  FungiblePostCondition,
  NonFungibleComparator,
  NonFungibleConditionCode,
  NonFungiblePostCondition,
  PostCondition,
  PostConditionType,
  PoxComparator,
  PoxConditionCode,
  PoxPostCondition,
  StakingPostCondition,
  StxPostCondition,
  isClarityAbiOptional,
  isClarityAbiPrimitive,
  isClarityName,
  validateStacksAddress,
} from '@stacks/transactions';

import { isUint128 } from '../../../../common/utils/number-utils';
import { validateAssettId, validateStacksContractId } from '../../../../common/utils/utils';
import { Input } from '../../../../ui/Input';
import { Text } from '../../../../ui/Text';
import { Caption } from '../../../../ui/typography';
import { NonTupleValueType } from '../../types/values';
import { FormikSetFieldValueFunction, FunctionFormikState } from './FunctionView';

type PostConditionConditionCode =
  | FungibleConditionCode
  | NonFungibleConditionCode
  | PoxConditionCode;

function isFungibleConditionCode(code: PostConditionConditionCode): code is FungibleConditionCode {
  return Object.values(FungibleConditionCode).includes(code as FungibleConditionCode);
}

function isNonFungibleConditionCode(
  code: PostConditionConditionCode
): code is NonFungibleConditionCode {
  return Object.values(NonFungibleConditionCode).includes(code as NonFungibleConditionCode);
}

function fungibleConditionCodeToComparator(code: FungibleConditionCode): FungibleComparator {
  switch (code) {
    case FungibleConditionCode.Equal:
      return 'eq';
    case FungibleConditionCode.Greater:
      return 'gt';
    case FungibleConditionCode.GreaterEqual:
      return 'gte';
    case FungibleConditionCode.Less:
      return 'lt';
    case FungibleConditionCode.LessEqual:
      return 'lte';
    default:
      return 'eq';
  }
}

function isConditionCodeValidForType(
  postConditionType: PostConditionType,
  code: PostConditionConditionCode
): boolean {
  if (postConditionType === PostConditionType.NonFungible) {
    return isNonFungibleConditionCode(code);
  }
  if (postConditionType === PostConditionType.PoX) {
    return isPoxConditionCode(code);
  }
  return isFungibleConditionCode(code);
}

function isPoxConditionCode(code: PostConditionConditionCode): code is PoxConditionCode {
  return Object.values(PoxConditionCode).includes(code as PoxConditionCode);
}

function poxConditionCodeToComparator(code: PoxConditionCode): PoxComparator {
  switch (code) {
    case PoxConditionCode.WillNotPerform:
      return 'will-not-perform';
    case PoxConditionCode.MayPerform:
      return 'may-perform';
    case PoxConditionCode.WillPerform:
      return 'will-perform';
    default:
      return 'will-perform';
  }
}

function nonFungibleConditionCodeToComparator(
  code: NonFungibleConditionCode
): NonFungibleComparator {
  switch (code) {
    case NonFungibleConditionCode.Sends:
      return 'sent';
    case NonFungibleConditionCode.DoesNotSend:
      return 'not-sent';
    case NonFungibleConditionCode.MaybeSent:
      return 'maybe-sent';
    default:
      return 'sent';
  }
}

export interface PostConditionParameters {
  postConditionType?: PostConditionType;
  postConditionAddress?: string;
  postConditionConditionCode?: PostConditionConditionCode;
  postConditionAmount?: string;
  postConditionAsset?: string;
  postConditionAssetId?: string;
}

export type PostConditionParameterKeys = keyof PostConditionParameters;

export const postConditionParameterMap: Record<PostConditionType, PostConditionParameterKeys[]> = {
  [PostConditionType.STX]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
  ],
  [PostConditionType.Fungible]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
    'postConditionAsset',
  ],
  [PostConditionType.NonFungible]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAsset',
    'postConditionAssetId',
  ],
  [PostConditionType.Staking]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
  ],
  [PostConditionType.PoX]: ['postConditionAddress', 'postConditionConditionCode'],
};

export const postConditionParameterLabels: Record<string, string> = {
  postConditionAddress: 'Principal',
  postConditionConditionCode: 'Condition Code',
  postConditionAmount: 'Amount',
  postConditionAsset: 'Asset identifier',
  postConditionAssetId: 'NFT identifier',
};

export const PostConditionOptions = [
  { label: 'STX Post Condition', value: PostConditionType.STX },
  { label: 'Fungible Post Condition', value: PostConditionType.Fungible },
  { label: 'Non-Fungible Post Condition', value: PostConditionType.NonFungible },
  { label: 'Staking Post Condition', value: PostConditionType.Staking },
  { label: 'PoX Post Condition', value: PostConditionType.PoX },
];

export const emptyPostCondition: PostConditionParameters = {
  postConditionType: undefined,
  postConditionAddress: 'origin',
  postConditionAmount: '',
  postConditionConditionCode: undefined,
  postConditionAsset: '',
  postConditionAssetId: '',
};

const MAX_POST_CONDITION_AMOUNT = BigInt('18446744073709551615');

function normalized(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isPostConditionAmount(value: string | undefined): boolean {
  const amount = normalized(value);
  if (!/^\d+$/.test(amount)) return false;
  try {
    return BigInt(amount) <= MAX_POST_CONDITION_AMOUNT;
  } catch {
    return false;
  }
}

function isPostConditionPrincipal(value: string | undefined): boolean {
  const principal = normalized(value);
  return (
    principal === 'origin' ||
    validateStacksAddress(principal) ||
    validateStacksContractId(principal)
  );
}

function isAssetIdentifier(value: string | undefined): value is AssetString {
  const asset = normalized(value);
  if (!validateAssettId(asset)) return false;
  const tokenName = asset.split('::')[1];
  return !!tokenName && isClarityName(tokenName);
}

function parseNftIdentifier(value: string | undefined) {
  return Cl.parse(normalized(value));
}

export function getPostCondition(postConditionParameters: PostConditionParameters): PostCondition {
  const {
    postConditionType,
    postConditionConditionCode,
    postConditionAmount: rawAmount,
    postConditionAsset: rawAsset,
    postConditionAssetId,
  } = postConditionParameters;
  const postConditionAddress = normalized(postConditionParameters.postConditionAddress);
  const postConditionAmount = normalized(rawAmount);
  const postConditionAsset = normalized(rawAsset);

  if (
    postConditionType === PostConditionType.STX &&
    isPostConditionPrincipal(postConditionAddress) &&
    postConditionConditionCode != null &&
    isPostConditionAmount(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    return {
      type: 'stx-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      amount: postConditionAmount,
    } satisfies StxPostCondition;
  }
  if (
    postConditionType === PostConditionType.Fungible &&
    isPostConditionPrincipal(postConditionAddress) &&
    isAssetIdentifier(postConditionAsset) &&
    postConditionConditionCode != null &&
    isPostConditionAmount(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    return {
      type: 'ft-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      asset: postConditionAsset,
      amount: postConditionAmount,
    } satisfies FungiblePostCondition;
  }
  if (
    postConditionType === PostConditionType.NonFungible &&
    isPostConditionPrincipal(postConditionAddress) &&
    isAssetIdentifier(postConditionAsset) &&
    postConditionConditionCode != null &&
    isNonFungibleConditionCode(postConditionConditionCode)
  ) {
    try {
      return {
        type: 'nft-postcondition',
        address: postConditionAddress,
        condition: nonFungibleConditionCodeToComparator(postConditionConditionCode),
        asset: postConditionAsset,
        assetId: parseNftIdentifier(postConditionAssetId),
      } satisfies NonFungiblePostCondition;
    } catch {
      // The validation error below is surfaced to the user before submission.
    }
  }
  if (
    postConditionType === PostConditionType.Staking &&
    isPostConditionPrincipal(postConditionAddress) &&
    postConditionConditionCode != null &&
    isPostConditionAmount(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    return {
      type: 'staking-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      amount: postConditionAmount,
    } satisfies StakingPostCondition;
  }
  if (
    postConditionType === PostConditionType.PoX &&
    isPostConditionPrincipal(postConditionAddress) &&
    postConditionConditionCode != null &&
    isPoxConditionCode(postConditionConditionCode)
  ) {
    return {
      type: 'pox-postcondition',
      address: postConditionAddress,
      condition: poxConditionCodeToComparator(postConditionConditionCode),
    } satisfies PoxPostCondition;
  }

  throw new Error(
    `Invalid ${PostConditionOptions.find(({ value }) => value === postConditionType)?.label ?? 'post-condition'} configuration`
  );
}

export function getPostConditions(
  postConditionParameters: PostConditionParameters[]
): PostCondition[] {
  return postConditionParameters.map(getPostCondition);
}

export const checkFunctionParameters = (fn: ClarityAbiFunction, values: FunctionFormikState) => {
  const errors: Record<string, string> = {};
  fn.args.forEach(({ name: arg, type }) => {
    const isOptional = isClarityAbiOptional(type);
    const optionalTypeIsPrincipal =
      isOptional && isClarityAbiPrimitive(type.optional) && type.optional === 'principal';
    if (!isOptional && (values[arg] == null || values[arg] === '')) {
      errors[arg] = `${arg} is required`;
      return;
    }
    if (type === 'principal' || (optionalTypeIsPrincipal && !!values[arg])) {
      const validPrincipal = validateStacksAddress(
        (values[arg] as NonTupleValueType).toString().split('.')[0]
      );
      if (!validPrincipal) {
        errors[arg] = 'Invalid Stacks address';
        return;
      }
    }
    if (type === 'uint128' && !isUint128(values[arg] as number)) {
      errors[arg] = 'Invalid uint128 value';
      return;
    }
  });
  return errors;
};

export const checkPostConditionParameters = (
  formikState: PostConditionParameters
): FormikErrors<PostConditionParameters> => {
  const errors: Record<string, string> = {};
  if (formikState.postConditionType == null) {
    return { postConditionType: 'Post-condition type is required' };
  }
  const postConditionParameters =
    postConditionParameterMap[formikState.postConditionType as PostConditionType];
  postConditionParameters?.forEach(key => {
    const value = formikState[key];
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      errors[key] = `${postConditionParameterLabels[key]} is required`;
      return;
    }
    if (key === 'postConditionAddress' && !isPostConditionPrincipal(value as string)) {
      errors[key] = 'Enter origin, a Stacks address, or a contract principal';
      return;
    }
    if (key === 'postConditionAsset' && !isAssetIdentifier(value as string)) {
      errors[key] = 'Enter an asset identifier in address.contract::token format';
      return;
    }
    if (key === 'postConditionAssetId') {
      try {
        parseNftIdentifier(value as string);
      } catch {
        errors[key] = 'Enter a valid Clarity value, such as u1';
      }
      return;
    }
    if (
      key === 'postConditionConditionCode' &&
      !isConditionCodeValidForType(
        formikState.postConditionType as PostConditionType,
        value as PostConditionConditionCode
      )
    ) {
      errors[key] = 'Condition code does not match the selected post condition type';
      return;
    }
    if (key === 'postConditionAmount') {
      if (!isPostConditionAmount(value as string)) {
        errors[key] = 'Enter an integer from 0 to 18446744073709551615';
        return;
      }
    }
  });
  return errors;
};

export function checkPostConditions(
  postConditions: PostConditionParameters[]
): FormikErrors<PostConditionParameters>[] {
  return postConditions.map(checkPostConditionParameters);
}

interface Option<T> {
  label: string;
  value: T;
}

function getPostConditionConditionCodeOptions(
  postConditionType: PostConditionType
): Option<PostConditionConditionCode>[] {
  if (postConditionType === PostConditionType.NonFungible) {
    return [
      {
        label: 'Does not send',
        value: NonFungibleConditionCode.DoesNotSend,
      },
      {
        label: 'Sends',
        value: NonFungibleConditionCode.Sends,
      },
      {
        label: 'May send',
        value: NonFungibleConditionCode.MaybeSent,
      },
    ];
  }
  if (postConditionType === PostConditionType.PoX) {
    return [
      {
        label: 'Will not perform',
        value: PoxConditionCode.WillNotPerform,
      },
      {
        label: 'May perform',
        value: PoxConditionCode.MayPerform,
      },
      {
        label: 'Will perform',
        value: PoxConditionCode.WillPerform,
      },
    ];
  }
  const action = postConditionType === PostConditionType.Staking ? 'Locks' : 'Sends';
  return [
    {
      label: `${action} exactly`,
      value: FungibleConditionCode.Equal,
    },
    {
      label: `${action} more than`,
      value: FungibleConditionCode.Greater,
    },
    {
      label: `${action} at least`,
      value: FungibleConditionCode.GreaterEqual,
    },
    { label: `${action} less than`, value: FungibleConditionCode.Less },
    {
      label: `${action} at most`,
      value: FungibleConditionCode.LessEqual,
    },
  ];
}

function getParameterHint(
  postConditionType: PostConditionType,
  parameter: PostConditionParameterKeys
): string | undefined {
  if (parameter === 'postConditionAddress') {
    return 'Use origin for the transaction sender, or enter an address or contract principal.';
  }
  if (parameter === 'postConditionAmount') {
    return postConditionType === PostConditionType.Fungible
      ? "Enter the amount in the token's smallest unit."
      : 'Enter the amount in micro-STX.';
  }
  if (parameter === 'postConditionAsset') {
    return 'Use the fully qualified identifier: address.contract::token.';
  }
  if (parameter === 'postConditionAssetId') {
    return 'Enter the NFT instance as a Clarity value, for example u1 or "name".';
  }
  return undefined;
}

function getParameterPlaceholder(parameter: PostConditionParameterKeys): string | undefined {
  if (parameter === 'postConditionAddress') return 'origin or SP…(.contract)';
  if (parameter === 'postConditionAsset') return 'SP….contract::token';
  if (parameter === 'postConditionAssetId') return 'u1';
  return undefined;
}

const postConditionTypeSelectOptions = PostConditionOptions.map(option => ({
  label: option.label,
  value: String(option.value),
}));

function getIndexedPostConditionErrors(
  errors: FormikErrors<FunctionFormikState>,
  index: number
): FormikErrors<PostConditionParameters> {
  if (!Array.isArray(errors.postConditions)) return {};
  const indexedErrors = errors.postConditions[index];
  return indexedErrors && typeof indexedErrors === 'object' ? indexedErrors : {};
}

export function PostConditionForm({
  values,
  errors,
  formikSetFieldValue,
}: {
  values: FunctionFormikState;
  errors: FormikErrors<FunctionFormikState>;
  formikSetFieldValue: FormikSetFieldValueFunction;
}) {
  return (
    <FieldArray name="postConditions">
      {({ push, remove }) => (
        <Stack gap={4}>
          <Flex justifyContent="space-between" alignItems="center" gap={3} flexWrap="wrap">
            <Box>
              <Text fontSize="sm" fontWeight="semibold">
                Conditions
              </Text>
              <Caption color="textSubdued">
                {values.postConditions.length === 0
                  ? 'No post-conditions added'
                  : `${values.postConditions.length} post-condition${
                      values.postConditions.length === 1 ? '' : 's'
                    } added`}
              </Caption>
            </Box>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => push({ ...emptyPostCondition })}
            >
              Add post-condition
            </Button>
          </Flex>

          {values.postConditions.map((postCondition, index) => {
            const indexedErrors = getIndexedPostConditionErrors(errors, index);
            const postConditionType = postCondition.postConditionType;
            const conditionCodeOptions =
              postConditionType == null
                ? []
                : getPostConditionConditionCodeOptions(postConditionType).map(option => ({
                    label: option.label,
                    value: String(option.value),
                  }));

            return (
              <Box
                key={index}
                borderWidth="1px"
                borderColor="borderSecondary"
                borderRadius="md"
                p={4}
              >
                <Stack gap={4}>
                  <Flex justifyContent="space-between" alignItems="center" gap={3}>
                    <Text fontSize="sm" fontWeight="semibold">
                      Post-condition {index + 1}
                    </Text>
                    <Button
                      type="button"
                      variant="text"
                      aria-label={`Remove post-condition ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  </Flex>

                  <Stack gap={2}>
                    <Select
                      placeholder="Post-condition type"
                      items={postConditionTypeSelectOptions}
                      label={`Post-condition ${index + 1} type`}
                      value={postConditionType == null ? [] : [String(postConditionType)]}
                      onValueChange={details => {
                        const value = details.value[0];
                        if (value == null) return;
                        void formikSetFieldValue(`postConditions.${index}`, {
                          ...emptyPostCondition,
                          postConditionType: Number(value) as PostConditionType,
                        });
                      }}
                      size="sm"
                    />
                    {indexedErrors.postConditionType && (
                      <Caption color="error">{indexedErrors.postConditionType}</Caption>
                    )}
                  </Stack>

                  {postConditionType != null && (
                    <Stack gap={4}>
                      {postConditionParameterMap[postConditionType].map(parameter => {
                        const fieldName = `postConditions.${index}.${parameter}`;
                        const hint = getParameterHint(postConditionType, parameter);
                        return (
                          <Box key={parameter}>
                            {parameter !== 'postConditionConditionCode' ? (
                              <Stack gap={2}>
                                <chakra.label
                                  htmlFor={`post-condition-${index}-${parameter}`}
                                  fontSize="12px"
                                  fontWeight="500"
                                  display="block"
                                  color="text"
                                  mb="tight"
                                >
                                  {postConditionParameterLabels[parameter]}
                                </chakra.label>
                                <Box width="100%">
                                  <Field
                                    type="text"
                                    inputMode={
                                      parameter === 'postConditionAmount' ? 'numeric' : undefined
                                    }
                                    pattern={
                                      parameter === 'postConditionAmount' ? '[0-9]*' : undefined
                                    }
                                    placeholder={getParameterPlaceholder(parameter)}
                                    name={fieldName}
                                    id={`post-condition-${index}-${parameter}`}
                                    as={Input}
                                  />
                                </Box>
                                {hint && <Caption color="textSubdued">{hint}</Caption>}
                                {indexedErrors[parameter] && (
                                  <Caption color="error">{indexedErrors[parameter]}</Caption>
                                )}
                              </Stack>
                            ) : (
                              <Stack gap={2}>
                                <Select
                                  placeholder="Condition code"
                                  items={conditionCodeOptions}
                                  label={`Post-condition ${index + 1} condition code`}
                                  value={
                                    postCondition.postConditionConditionCode == null
                                      ? []
                                      : [String(postCondition.postConditionConditionCode)]
                                  }
                                  onValueChange={details => {
                                    const value = details.value[0];
                                    if (value == null) return;
                                    void formikSetFieldValue(
                                      fieldName,
                                      Number(value) as PostConditionConditionCode
                                    );
                                  }}
                                  size="sm"
                                />
                                {indexedErrors.postConditionConditionCode && (
                                  <Caption color="error">
                                    {indexedErrors.postConditionConditionCode}
                                  </Caption>
                                )}
                              </Stack>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </FieldArray>
  );
}
