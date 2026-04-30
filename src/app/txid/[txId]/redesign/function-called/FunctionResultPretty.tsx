import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { Box, Flex } from '@chakra-ui/react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';
import { Cl, hexToCV } from '@stacks/transactions';

export function FunctionResultPretty({ tx }: { tx: ContractCallTransaction }) {
  const result = tx.tx_result;
  const pretty = Cl.stringify(hexToCV(result.hex), 2);

  return (
    <Flex alignItems="flex-start" gap={2} w="full" minW={0}>
      <Box
        as="pre"
        flex={1}
        minW={0}
        fontFamily="matterMono"
        fontSize="sm"
        whiteSpace="pre-wrap"
        wordBreak="break-all"
        bg="surfaceHighlight"
        p={3}
        borderRadius="md"
        m={0}
        maxH={96}
        overflowY="auto"
      >
        {pretty}
      </Box>
      <RowCopyButton value={pretty} ariaLabel="copy function result" />
    </Flex>
  );
}
