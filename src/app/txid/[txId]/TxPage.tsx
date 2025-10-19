import { getTxTypeIcon } from '@/common/components/TxIcon';
import { TransactionType } from '@/common/constants/constants';
import { getTransactionStatus, getTxTitle } from '@/common/utils/transactions';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/ui/Text';
import { Icon, Stack } from '@chakra-ui/react';
import { Check, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import * as React from 'react';
import { ReactNode } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { PageTitleWithTags } from '../../_components/PageTitle';
import { TowColLayout } from '../../_components/TwoColLayout';
import { StxBalance } from '../../address/[principal]/StxBalance';
import { TokenBalanceCard } from '../../address/[principal]/TokenBalanceCard';
import { ContractDetailsCard } from './Cards/ContractDetailsCard';
import { TxBtcAnchorBlockCard } from './Cards/TxBtcAnchorBlockCard';
import { Events } from './Events';
import { TxAlerts } from './TxAlerts';

export const txTypeNamesMap = {
  [TransactionType.SMART_CONTRACT]: 'Contract deploy',
  [TransactionType.CONTRACT_CALL]: 'Function call',
  [TransactionType.TOKEN_TRANSFER]: 'Token transfer',
  [TransactionType.COINBASE]: 'Coinbase',
  [TransactionType.POISON_MICROBLOCK]: 'Poison-microblock',
  tenure_change: 'Tenure change',
};

const txStatusIconMap: Record<string, React.ReactNode> = {
  pending: <CircleNotch />,
  success: <Check />,
  success_anchor_block: <Check />,
  non_canonical: <WarningCircle />,
  failed: <WarningCircle />,
  dropped: <WarningCircle />,
};

const txStatusLabelMap = {
  pending: 'In mempool',
  success: 'Confirmed',
  success_anchor_block: 'Confirmed in block',
  success_microblock: 'Included in microblock',
  non_canonical: 'Non-canonical (orphaned)',
  failed: 'Failed',
  dropped: 'Dropped',
};

export const TxPage: React.FC<{
  tx: Transaction | MempoolTransaction;
  contractId?: string;
  txDetails: ReactNode;
  children?: ReactNode;
}> = ({ tx, contractId, txDetails, children }) => {
  return (
    <>
      <PageTitleWithTags
        tags={
          <>
            <Tag
              startElement={
                <Icon h={3.5} w={3.5} color="iconSecondary">
                  {getTxTypeIcon(tx.tx_type)}
                </Icon>
              }
              bg="surfaceFifth"
            >
              <Text color="textSecondary">{txTypeNamesMap[tx.tx_type]}</Text>
            </Tag>
            <Tag
              startElement={
                <Icon h={3.5} w={3.5} color="iconSecondary">
                  {txStatusIconMap[getTransactionStatus(tx)]}
                </Icon>
              }
              bg="surfaceFifth"
            >
              <Text color="textSecondary">{txStatusLabelMap[getTransactionStatus(tx)]}</Text>
            </Tag>
          </>
        }
      >
        {getTxTitle(tx)}
      </PageTitleWithTags>
      <TowColLayout>
        <Stack gap={7}>
          <TxAlerts tx={tx} />
          {txDetails}
          {'events' in tx && <Events tx={tx} />}
          {children}
        </Stack>
        <Stack gap={7}>
          {contractId && <ContractDetailsCard contractId={contractId} />}
          <TxBtcAnchorBlockCard tx={tx} />
          {contractId && (
            <>
              <StxBalance address={contractId} />
              <TokenBalanceCard address={contractId} />
            </>
          )}
        </Stack>
      </TowColLayout>
    </>
  );
};
