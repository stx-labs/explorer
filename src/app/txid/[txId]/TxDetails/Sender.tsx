'use client';

import { HStack, Icon } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { FC } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { ExplorerLink } from '../../../../common/components/ExplorerLinks';
import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { getSenderName } from '../utils';

export const Sender: FC<{ tx: Transaction | MempoolTransaction }> = ({ tx }) => (
  <KeyValueHorizontal
    label={getSenderName(tx.tx_type)}
    value={
      <HStack>
        <Icon h={4} w={4}>
          <ArrowUpRight />
        </Icon>
        <ExplorerLink
          fontSize={'xs'}
          fontWeight={'medium'}
          href={`/address/${encodeURIComponent(tx.sender_address)}`}
        >
          {tx.sender_address}
        </ExplorerLink>
      </HStack>
    }
    copyValue={tx.sender_address}
  />
);
