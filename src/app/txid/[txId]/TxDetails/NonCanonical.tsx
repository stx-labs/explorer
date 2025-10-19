'use client';

import { Box, Flex, Icon, IconButton, Link } from '@chakra-ui/react';
import { Question } from '@phosphor-icons/react';
import { FC } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { TransactionStatus } from '../../../../common/constants/constants';

export const NonCanonical: FC<{
  tx: Transaction | MempoolTransaction;
}> = ({ tx }) => {
  const showNonCanonical =
    (tx.tx_status !== TransactionStatus.PENDING && 'canonical' in tx && !tx.canonical) ||
    ('microblock_canonical' in tx && !tx.microblock_canonical);
  if (!showNonCanonical) return null;
  return (
    <KeyValueHorizontal
      label={'Non-canonical'}
      value={
        <Flex alignItems="center">
          <Box>
            Transaction is in a non-canonical fork. It has been orphaned by the canonical chain.
          </Box>
          <Link
            href="https://github.com/stacksgov/sips/blob/main/sips/sip-001/sip-001-burn-election.md#committing-to-a-chain-tip"
            target="_blank" // TODO: upgrade to v3. This might be broken
          >
            <IconButton ml={2} aria-label={'sip-001'}>
              <Icon>
                <Question />
              </Icon>
            </IconButton>
          </Link>
        </Flex>
      }
    />
  );
};
