import { Flex, FlexProps, Icon } from '@chakra-ui/react';
import { FC } from 'react';

import { ContractCallTransaction } from '@stacks/stacks-blockchain-api-types';

import { Text } from '../../../../ui/Text';
import FunctionXIcon from '../../../../ui/icons/FunctionX';

export const FunctionSummaryName: FC<
  { summary: ContractCallTransaction['contract_call'] } & FlexProps
> = ({ summary, ...rest }) => {
  return (
    <Flex width="100%" alignItems="center" justifyContent="space-between" {...rest}>
      <Flex>
        <Icon mr="8px" h={4.5} w={4.5}>
          <FunctionXIcon />
        </Icon>
        <Text fontWeight="600" fontSize={'14px'}>
          {summary.function_name}
        </Text>
      </Flex>
    </Flex>
  );
};
