'use client';

import { Box, Flex, Icon } from '@chakra-ui/react';
import { Clock } from '@phosphor-icons/react';
import { FC } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';
import { toRelativeTime } from '../../../../common/utils/utils';
import { Tooltip } from '../../../../ui/Tooltip';
import { isInMempool } from '../utils';

export const Broadcast: FC<{
  tx: Transaction | MempoolTransaction;
}> = ({ tx }) => {
  if (!isInMempool(tx)) return null;

  const ts = tx.receipt_time;
  if (!ts) return null;

  const readableTs = `${new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })} ${new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })}`;

  return (
    <KeyValueHorizontal
      label={'Broadcast'}
      value={
        <>
          <Box>
            <Tooltip content={readableTs}>
              <Flex alignItems="center">
                <Icon h={4} w={4} mr={1}>
                  <Clock />
                </Icon>
                <Value suppressHydrationWarning={true}>{toRelativeTime(ts * 1000)}</Value>
              </Flex>
            </Tooltip>
          </Box>
        </>
      }
      copyValue={readableTs}
    />
  );
};
