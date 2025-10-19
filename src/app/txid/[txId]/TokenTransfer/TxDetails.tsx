import { Box, Flex } from '@chakra-ui/react';
import * as React from 'react';

import {
  MempoolTokenTransferTransaction,
  TokenTransferTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { Section } from '../../../../common/components/Section';
import { Amount } from '../TxDetails/Amount';
import { BlockHash } from '../TxDetails/BlockHash';
import { BlockHeight } from '../TxDetails/BlockHeight';
import { Fees } from '../TxDetails/Fees';
import { ID } from '../TxDetails/ID';
import { Memo } from '../TxDetails/Memo';
import { NonCanonical } from '../TxDetails/NonCanonical';
import { Nonce } from '../TxDetails/Nonce';
import { Recipient } from '../TxDetails/Recipient';
import { Sender } from '../TxDetails/Sender';

interface TxDetailsProps {
  tx: TokenTransferTransaction | MempoolTokenTransferTransaction;
}

export const TxDetails: React.FC<TxDetailsProps> = ({ tx }) => {
  return (
    <>
      <Section title="Summary" className="tx-details-summary">
        <Flex width="100%" flexDirection={['column', 'column', 'row']}>
          <Box width={['100%']}>
            <Amount tx={tx} />
            <Sender tx={tx} />
            <Recipient tx={tx} />
            <ID tx={tx} />
            <Fees tx={tx} />
            <Nonce tx={tx} />
            <BlockHeight tx={tx} />
            <BlockHash tx={tx} />
            <Memo tx={tx} />
            <NonCanonical tx={tx} />
          </Box>
        </Flex>
      </Section>
    </>
  );
};
