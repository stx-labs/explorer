import { Box, HStack } from '@chakra-ui/react';

import { cvToJSON, hexToCV } from '@stacks/transactions';

import { AddressLink, TxLink } from '../../../../common/components/ExplorerLinks';
import { Value } from '../../../../common/components/Value';
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { microToStacksFormatted } from '../../../../common/utils/utils';
import { Text } from '../../../../ui/Text';
import { TextLink } from '../../../../ui/TextLink';
import { Caption } from '../../../../ui/typography';

const getPrettyClarityValueType = (type: any) => {
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

const tupleToArr = (tuple: string) =>
  tuple
    .replace('(tuple (', '')
    .replace('))', '')
    .split(') (')
    .map(item => item.split(' '));

const TupleResult = ({ tuple, isPoxAddr, btc }: any) => {
  const { btcAddressBaseUrl } = useGlobalContext().activeNetwork;
  let additional: any = null;
  if (isPoxAddr && btc) {
    additional = (
      <Box display="block" as="span">
        <Caption mb="4px">BTC address (converted)</Caption>
        <TextLink target="_blank" href={`${btcAddressBaseUrl}/${btc}`}>
          {btc}
        </TextLink>
      </Box>
    );
  }

  return (
    <>
      {tuple.map((entry: any, index: number, arr: any[]) =>
        entry && entry.length ? (
          <Box
            display="block"
            mb={index !== arr.length - 1 || !!additional ? '8px' : 'unset'}
            as="span"
            key={index}
          >
            <Caption mb="4px">{entry?.[0]?.replace(/\(/g, '')}</Caption>
            <Text>{entry?.[1]?.replace(/\)/g, '')}</Text>
          </Box>
        ) : null
      )}
      {additional}
    </>
  );
};

export const getValue = (
  arg: {
    type: string;
    repr: string;
    name: string;
  },
  btc: null | string
) => {
  if (arg.type === 'uint') {
    const value = arg.repr.replace('u', '');
    if (arg.name.includes('ustx')) {
      return `${microToStacksFormatted(value)} STX`;
    }
    return parseInt(value).toLocaleString();
  }
  if (arg.type.includes('tuple')) {
    const value = tupleToArr(arg.repr);

    return <TupleResult isPoxAddr={arg.name === 'pox-addr'} btc={btc} tuple={value} />;
  }
  return arg.repr;
};

export const FunctionSummaryClarityValue = ({ arg, btc }: { arg: any; btc: null | string }) => {
  if (arg.type === 'principal') {
    const principal = arg.hex ? (cvToJSON(hexToCV(arg.hex)) || {}).value : '';
    const isContract = principal.includes('.');
    if (isContract) {
      return (
        <HStack width="100%" flexGrow={1} gap={2}>
          <TxLink txId={principal}>{principal}</TxLink>
          <Caption whiteSpace={'nowrap'}>{getPrettyClarityValueType(arg.type)}</Caption>
        </HStack>
      );
    }
    return (
      <HStack width="100%" flexGrow={1} gap={2}>
        <AddressLink principal={principal}>{arg.repr}</AddressLink>
        <Caption whiteSpace={'nowrap'}>{getPrettyClarityValueType(arg.type)}</Caption>
      </HStack>
    );
  }
  return (
    <HStack width="100%" flexGrow={1} gap={2}>
      <Value>{getValue(arg, btc)}</Value>
      <Caption whiteSpace={'nowrap'}>{getPrettyClarityValueType(arg.type)}</Caption>
    </HStack>
  );
};
