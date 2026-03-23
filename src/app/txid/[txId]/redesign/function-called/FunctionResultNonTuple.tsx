import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { Text } from '@/ui/Text';
import { Flex } from '@chakra-ui/react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';

import { formatFunctionResult } from './utils';

export const FunctionResultNonTuple = ({ tx }: { tx: ContractCallTransaction }) => {
  const result = tx.tx_result;
  const formattedResult = formatFunctionResult(result);
  const firstFormattedResult = formattedResult[0];
  if (!firstFormattedResult) return null;
  const { value } = firstFormattedResult;
  return (
    <Flex alignItems="center" gap={1}>
      <Text textStyle="text-regular-sm" color="textPrimary">
        {value}
      </Text>
      <RowCopyButton value={value} ariaLabel={`copy function result`} />
    </Flex>
  );
};
