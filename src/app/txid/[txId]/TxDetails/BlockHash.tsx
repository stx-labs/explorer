'use client';

import { FC } from 'react';
import * as React from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { BlockLink } from '../../../../common/components/ExplorerLinks';
import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { TextLink } from '../../../../ui/TextLink';

export const BlockHash: FC<{
  tx: Transaction | MempoolTransaction;
}> = ({ tx }) => {
  if (
    !('block_hash' in tx) ||
    typeof tx.block_hash === 'undefined' ||
    (tx?.tx_status === 'success' && tx.is_unanchored)
  )
    return null;
  return (
    <KeyValueHorizontal
      label={'Block hash'}
      value={
        <BlockLink hash={tx.block_hash} fontSize={'xs'} fontWeight={'medium'}>
          {tx.block_hash}
        </BlockLink>
      }
      copyValue={tx.block_hash}
    />
  );
};
