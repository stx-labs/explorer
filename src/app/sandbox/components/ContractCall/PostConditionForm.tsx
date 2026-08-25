import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { CaretDown } from '@phosphor-icons/react';
import { Field, FormikErrors } from 'formik';
import { useState } from 'react';

import {
  Cl,
  ClarityAbiFunction,
  FungibleComparator,
  FungibleConditionCode,
  FungiblePostCondition,
  NonFungibleComparator,
  NonFungibleConditionCode,
  NonFungiblePostCondition,
  PostCondition,
  PostConditionMode,
  PostConditionType,
  PoxComparator,
  PoxConditionCode,
  PoxPostCondition,
  StakingPostCondition,
  StxPostCondition,
  isClarityAbiOptional,
  isClarityAbiPrimitive,
  validateStacksAddress,
} from '@stacks/transactions';

import { isUint128 } from '../../../../common/utils/number-utils';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../../../../components/ui/menu';
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
  postConditionMode?: PostConditionMode;
  postConditionType?: PostConditionType;
  postConditionAddress?: string;
  postConditionConditionCode?: PostConditionConditionCode;
  postConditionAmount?: number;
  postConditionAssetAddress?: string;
  postConditionAssetContractName?: string;
  postConditionAssetName?: string;
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
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ],
  [PostConditionType.NonFungible]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ],
  [PostConditionType.Staking]: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
  ],
  [PostConditionType.PoX]: ['postConditionAddress', 'postConditionConditionCode'],
};

export function isPostConditionParameter(key: string): key is keyof PostConditionParameters {
  const postConditionKeys: Array<keyof PostConditionParameters> = [
    'postConditionMode',
    'postConditionType',
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ];
  return postConditionKeys.includes(key as keyof PostConditionParameters);
}

export const postConditionParameterLabels: Record<string, string> = {
  postConditionAddress: 'Address',
  postConditionConditionCode: 'Condition Code',
  postConditionAmount: 'Amount',
  postConditionAssetAddress: 'Asset Address',
  postConditionAssetContractName: 'Asset Contract Name',
  postConditionAssetName: 'Asset Name',
};

export const PostConditionOptions = [
  { label: 'STX Post Condition', value: PostConditionType.STX },
  { label: 'Fungible Post Condition', value: PostConditionType.Fungible },
  { label: 'Non-Fungible Post Condition', value: PostConditionType.NonFungible },
  { label: 'Staking Post Condition', value: PostConditionType.Staking },
  { label: 'PoX Post Condition', value: PostConditionType.PoX },
];

export function getPostCondition(
  postConditionParameters: PostConditionParameters
): PostCondition[] {
  const {
    postConditionType,
    postConditionAddress,
    postConditionConditionCode,
    postConditionAmount,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
  } = postConditionParameters;
  let postCondition;

  if (
    postConditionType === PostConditionType.STX &&
    postConditionAddress &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = {
      type: 'stx-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      amount: postConditionAmount.toString(),
    } as StxPostCondition;
  } else if (
    postConditionType === PostConditionType.Fungible &&
    postConditionAddress &&
    postConditionAssetAddress &&
    postConditionAssetContractName &&
    postConditionAssetName &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = {
      type: 'ft-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      asset: `${postConditionAssetAddress}.${postConditionAssetContractName}::${postConditionAssetName}`,
      amount: postConditionAmount.toString(),
    } as FungiblePostCondition;
  } else if (
    postConditionType === PostConditionType.NonFungible &&
    postConditionAddress &&
    postConditionAssetAddress &&
    postConditionAssetContractName &&
    postConditionAssetName &&
    postConditionConditionCode &&
    isNonFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = {
      type: 'nft-postcondition',
      address: postConditionAddress,
      condition: nonFungibleConditionCodeToComparator(postConditionConditionCode),
      asset: `${postConditionAssetAddress}.${postConditionAssetContractName}::${postConditionAssetName}`,
      assetId: Cl.stringUtf8(postConditionAssetName),
    } as NonFungiblePostCondition;
  } else if (
    postConditionType === PostConditionType.Staking &&
    postConditionAddress &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = {
      type: 'staking-postcondition',
      address: postConditionAddress,
      condition: fungibleConditionCodeToComparator(postConditionConditionCode),
      amount: postConditionAmount.toString(),
    } as StakingPostCondition;
  } else if (
    postConditionType === PostConditionType.PoX &&
    postConditionAddress &&
    postConditionConditionCode &&
    isPoxConditionCode(postConditionConditionCode)
  ) {
    postCondition = {
      type: 'pox-postcondition',
      address: postConditionAddress,
      condition: poxConditionCodeToComparator(postConditionConditionCode),
    } as PoxPostCondition;
  } else if (
    postConditionType !== PostConditionType.STX &&
    postConditionType !== PostConditionType.Fungible &&
    postConditionType !== PostConditionType.NonFungible &&
    postConditionType !== PostConditionType.Staking &&
    postConditionType !== PostConditionType.PoX
  ) {
    throw new Error(`There is no post condition type that matches ${postConditionType}`);
  }

  return postCondition ? [postCondition as PostCondition] : [];
}

export const checkFunctionParameters = (fn: ClarityAbiFunction, values: FunctionFormikState) => {
  const errors: Record<string, string> = {};
  Object.keys(values).forEach(arg => {
    if (isPostConditionParameter(arg as PostConditionParameterKeys)) return;
    const type = fn.args.find(({ name }) => name === arg)?.type;
    const isOptional = type && isClarityAbiOptional(type);
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
  formikState: FunctionFormikState
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (formikState.postConditionMode === PostConditionMode.Allow) return errors;
  if (formikState.postConditionType == null) return errors;
  const postConditionParameters =
    postConditionParameterMap[formikState.postConditionType as PostConditionType];
  postConditionParameters?.forEach(key => {
    if (formikState[key] == null) {
      errors[key] = `${postConditionParameterLabels[key]} is required`;
      return;
    }
    if (
      (key === 'postConditionAddress' || key === 'postConditionAssetAddress') &&
      !validateStacksAddress(formikState[key].split('.')[0])
    ) {
      errors[key] = 'Invalid Stacks address';
      return;
    }
    if (
      key === 'postConditionConditionCode' &&
      !isConditionCodeValidForType(
        formikState.postConditionType as PostConditionType,
        formikState[key]
      )
    ) {
      errors[key] = 'Condition code does not match the selected post condition type';
      return;
    }
    if (key === 'postConditionAmount') {
      if (
        typeof formikState[key] !== 'number' ||
        !Number.isFinite(formikState[key]) ||
        (formikState[key] as number) < 0
      ) {
        errors[key] = 'Invalid amount';
        return;
      }
    }
  });
  return errors;
};

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
  return [
    {
      label: 'Equal',
      value: FungibleConditionCode.Equal,
    },
    {
      label: 'Greater',
      value: FungibleConditionCode.Greater,
    },
    {
      label: 'GreaterEqual',
      value: FungibleConditionCode.GreaterEqual,
    },
    { label: 'Less', value: FungibleConditionCode.Less },
    {
      label: 'LessEqual',
      value: FungibleConditionCode.LessEqual,
    },
  ];
}

export function PostConditionConditionCodeMenu({
  onChange,
  postConditionType,
}: {
  onChange: (option: any) => void;
  postConditionType: PostConditionType;
}) {
  const [selectedOption, setSelectedOption] = useState<
    Option<PostConditionConditionCode | undefined>
  >({
    label: 'Select a condition code',
    value: undefined,
  });
  const options = getPostConditionConditionCodeOptions(postConditionType);

  return (
    <MenuRoot>
      <MenuTrigger
        type="button"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <Flex gap={1}>
          <Text>{selectedOption.label}</Text>
          <Icon>
            <CaretDown />
          </Icon>
        </Flex>
      </MenuTrigger>
      <MenuContent>
        {options.map(option => (
          <MenuItem
            key={option.label}
            onClick={e => {
              e.stopPropagation();
              setSelectedOption(option);
              onChange(option);
            }}
            value={option.label}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}

export function PostConditionTypeMenu({ onChange }: { onChange: (option: any) => void }) {
  const [selectedOption, setSelectedOption] = useState<Option<PostConditionType | undefined>>({
    label: 'Select a post condition',
    value: undefined,
  });
  return (
    <MenuRoot>
      <Flex gap={2} alignItems="center">
        <MenuTrigger
          type="button"
          onClick={e => {
            e.stopPropagation();
          }}
        >
          <Flex gap={1}>
            <Text>{selectedOption.label}</Text>
            <Icon>
              <CaretDown />
            </Icon>
          </Flex>
        </MenuTrigger>
      </Flex>
      <MenuContent>
        {PostConditionOptions.map(option => (
          <MenuItem
            key={option.label}
            onClick={e => {
              e.stopPropagation();
              setSelectedOption(option);
              onChange(option);
            }}
            value={option.label}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}

export function PostConditionForm({
  values,
  errors,
  formikSetFieldValue,
  handleChange,
}: {
  values: FunctionFormikState;
  errors: FormikErrors<FunctionFormikState>;
  formikSetFieldValue: FormikSetFieldValueFunction;
  handleChange: any;
}) {
  return (
    <>
      {values.postConditionMode !== PostConditionMode.Allow && (
        <Stack gap={4}>
          <Stack gap={2}>
            <PostConditionTypeMenu
              onChange={(option: Option<PostConditionType>) => {
                formikSetFieldValue('postConditionType', option.value);
              }}
            />
            {errors && <Caption color="error">{errors.postConditionType}</Caption>}
          </Stack>
          {values.postConditionType != null && (
            <Stack gap={4}>
              {postConditionParameterMap[values.postConditionType].map(parameter => (
                <Box key={parameter}>
                  {parameter !== 'postConditionMode' &&
                  parameter !== 'postConditionType' &&
                  parameter !== 'postConditionConditionCode' ? (
                    <Stack gap={2}>
                      <Text
                        fontSize="12px"
                        fontWeight="500"
                        display="block"
                        color="text"
                        mb="tight"
                      >
                        {postConditionParameterLabels[parameter]}
                      </Text>
                      <Box width="100%">
                        <Field
                          type={parameter === 'postConditionAmount' ? 'number' : 'text'}
                          name={parameter}
                          id={parameter}
                          component={Input}
                          onChange={handleChange}
                        />
                      </Box>
                      {errors[parameter] && <Caption color="error">{errors[parameter]}</Caption>}
                    </Stack>
                  ) : (
                    <Stack gap={2}>
                      <PostConditionConditionCodeMenu
                        onChange={(option: Option<PostConditionConditionCode>) => {
                          formikSetFieldValue('postConditionConditionCode', option.value);
                        }}
                        postConditionType={values.postConditionType as PostConditionType}
                      />
                      {errors.postConditionConditionCode && (
                        <Caption color="error">{errors.postConditionConditionCode}</Caption>
                      )}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </>
  );
}
