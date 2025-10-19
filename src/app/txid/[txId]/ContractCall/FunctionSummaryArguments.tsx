import { Box, Flex } from '@chakra-ui/react';
import * as React from 'react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';

import { Singleton } from '../../../../common/types/utils';
import { Text } from '../../../../ui/Text';
import { Pre } from '../../../../ui/typography';
import { FunctionSummaryClarityValue } from './FunctionSummaryClarityValue';

type FunctionArg = Singleton<
  Required<Required<ContractCallTransaction['contract_call']>['function_args']>
>;

export const FunctionSummaryArguments: React.FC<{
  summary: ContractCallTransaction['contract_call'];
  btc: null | string;
}> = ({ summary, btc }) => {
  const args = (summary?.function_args || []).filter(arg => !!arg);
  return summary.function_args ? (
    <Box width="100%">
      {args.map((arg: FunctionArg, key: number) => {
        return (
          <Flex
            key={key}
            gap={4}
            direction={'column'}
            pb={4}
            mb={4}
            css={{
              '&:last-child': {
                marginBottom: 0,
                paddingBottom: 0,
              },
            }}
          >
            <Flex alignItems="center">
              <Pre>{arg.name}</Pre>
            </Flex>
            <FunctionSummaryClarityValue btc={btc} arg={arg} />
          </Flex>
        );
      })}
    </Box>
  ) : (
    <Flex>
      <Text>This function has no arguments.</Text>
    </Flex>
  );
};
