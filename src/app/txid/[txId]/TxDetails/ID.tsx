'use client';

import { Flex } from '@chakra-ui/react';
import { FC } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';

export const ID: FC<{ tx: Transaction | MempoolTransaction }> = ({ tx }) => (
  <KeyValueHorizontal
    label={'Transaction ID'}
    value={
      <Flex alignItems={'center'}>
        <Value>{tx.tx_id}</Value>
      </Flex>
    }
    copyValue={tx.tx_id}
  />
);
