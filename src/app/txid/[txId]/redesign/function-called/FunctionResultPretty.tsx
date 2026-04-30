import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { Box, Flex } from '@chakra-ui/react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';

import { prettyFunctionResult } from './utils';

export const FUNCTION_RESULT_LABEL_ID = 'function-result-label';

export function FunctionResultPretty({ tx }: { tx: ContractCallTransaction }) {
  const { display } = prettyFunctionResult(tx.tx_result.hex);

  return (
    <Flex alignItems="flex-start" gap={2} w="full" minW={0}>
      <Box
        as="pre"
        flex={1}
        minW={0}
        textStyle="text-mono-sm"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
        bg="surfaceHighlight"
        p={3}
        borderRadius="md"
        m={0}
        maxH={96}
        overflowY="auto"
        tabIndex={0}
        role="region"
        aria-labelledby={FUNCTION_RESULT_LABEL_ID}
        data-testid="function-result"
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'accent.stacks-200',
          outlineOffset: '2px',
        }}
      >
        {display}
      </Box>
      <RowCopyButton value={display} ariaLabel="copy function result" />
    </Flex>
  );
}
