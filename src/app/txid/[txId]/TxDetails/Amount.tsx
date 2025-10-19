import { Flex, HStack } from '@chakra-ui/react';
import { FC } from 'react';

import {
  MempoolTokenTransferTransaction,
  TokenTransferTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { StxPriceButton } from '../../../../common/components/StxPriceButton';
import { microToStacksFormatted } from '../../../../common/utils/utils';
import { Text } from '../../../../ui/Text';

export const Amount: FC<{ tx: TokenTransferTransaction | MempoolTokenTransferTransaction }> = ({
  tx,
}) => {
  const stxValue = microToStacksFormatted(tx.token_transfer.amount);
  return (
    <KeyValueHorizontal
      label={'Amount'}
      value={
        <Flex alignItems={'center'}>
          <HStack alignItems="flex-start" gap={2}>
            <Text fontSize="16px" color={'textTitle'} fontWeight="500">
              {stxValue}{' '}
              <Text as="span" display="inline" opacity="0.5">
                STX
              </Text>
            </Text>
          </HStack>
          <StxPriceButton tx={tx} value={Number(tx.token_transfer.amount)} />
        </Flex>
      }
      copyValue={stxValue.toString()}
    />
  );
};
