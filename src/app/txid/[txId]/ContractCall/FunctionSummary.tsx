import { Box, Flex } from '@chakra-ui/react';
import { memo } from 'react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Section } from '../../../../common/components/Section';
import { FunctionSummaryArguments } from './FunctionSummaryArguments';
import { FunctionSummaryName } from './FunctionSummaryName';
import { FunctionSummaryResult } from './FunctionSummaryResult';

export const FunctionSummary = memo<{
  result?: any;
  summary: ContractCallTransaction['contract_call'];
  btc: null | string;
  txStatus: string | undefined;
}>(({ summary, result, btc, txStatus }) => {
  return (
    <Section title="Function called">
      <Flex px={4} width="100%" flexDirection={['column', 'column', 'row']}>
        <Box width={['100%']}>
          <KeyValueHorizontal
            label="Function"
            value={<FunctionSummaryName summary={summary} />}
            labelProps={{ alignSelf: 'flex-start' }}
          />
          <KeyValueHorizontal
            label="Result"
            value={<FunctionSummaryResult result={result} />}
            labelProps={{ alignSelf: 'flex-start' }}
          />
          <KeyValueHorizontal
            label="Arguments"
            value={<FunctionSummaryArguments btc={btc} summary={summary} />}
            labelProps={{ alignSelf: 'flex-start' }}
          />
        </Box>
      </Flex>
    </Section>
  );
});
