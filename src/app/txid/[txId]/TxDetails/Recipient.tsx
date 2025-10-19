import { HStack, Icon } from '@chakra-ui/react';
import { ArrowDownRight } from '@phosphor-icons/react';
import { FC } from 'react';

import {
  MempoolTokenTransferTransaction,
  TokenTransferTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { ExplorerLink } from '../../../../common/components/ExplorerLinks';
import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';

export const Recipient: FC<{ tx: TokenTransferTransaction | MempoolTokenTransferTransaction }> = ({
  tx,
}) => (
  <KeyValueHorizontal
    label={'Recipient'}
    value={
      <HStack>
        <Icon h={4} w={4}>
          <ArrowDownRight />
        </Icon>
        <ExplorerLink
          fontSize={'xs'}
          fontWeight={'medium'}
          href={`/address/${encodeURIComponent(tx.token_transfer.recipient_address)}`}
        >
          {tx.token_transfer.recipient_address}
        </ExplorerLink>
      </HStack>
    }
    copyValue={tx.token_transfer.recipient_address}
  />
);
