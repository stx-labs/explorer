import { SectionTabsContentContainer, SectionTabsTrigger } from '@/common/components/SectionTabs';
import { isConfirmedTx } from '@/common/utils/transactions';
import { TabsContent } from '@/ui/Tabs';
import { Stack } from '@chakra-ui/react';

import {
  MempoolTokenTransferTransaction,
  MempoolTransaction,
  TokenTransferTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { getTxAlert } from './Alert';
import { Events } from './Events';
import { TxHeader } from './TxHeader';
import { TransactionIdPageTab, TxTabs } from './TxTabs';
import { TxSummary } from './tx-summary/TxSummary';

export const TokenTransferPage = ({ tx }: { tx: Transaction | MempoolTransaction }) => {
  return (
    <>
      <Stack gap={3}>
        <TxHeader tx={tx} />
        {getTxAlert(tx)}
      </Stack>
      <TxTabs tx={tx} />
    </>
  );
};

export function TokenTransferTabTriggers({
  tx,
  selectedTab,
}: {
  tx: TokenTransferTransaction | MempoolTokenTransferTransaction;
  selectedTab: TransactionIdPageTab;
}) {
  const numTxEvents = isConfirmedTx<TokenTransferTransaction, MempoolTokenTransferTransaction>(tx)
    ? tx.event_count
    : 0;

  return (
    <>
      <SectionTabsTrigger
        key={TransactionIdPageTab.Overview}
        label="Overview"
        value={TransactionIdPageTab.Overview}
        isActive={selectedTab === TransactionIdPageTab.Overview}
      />
      <SectionTabsTrigger
        key={TransactionIdPageTab.Events}
        label={`Events`}
        secondaryLabel={numTxEvents > 0 ? `(${numTxEvents})` : ''}
        value={TransactionIdPageTab.Events}
        isActive={selectedTab === TransactionIdPageTab.Events}
      />
    </>
  );
}

export function TokenTransferTabContent({
  tx,
}: {
  tx: TokenTransferTransaction | MempoolTokenTransferTransaction;
}) {
  return (
    <>
      <TabsContent
        key={TransactionIdPageTab.Overview}
        value={TransactionIdPageTab.Overview}
        w="100%"
      >
        <SectionTabsContentContainer>
          <TxSummary tx={tx} />
        </SectionTabsContentContainer>
      </TabsContent>
      <TabsContent key={TransactionIdPageTab.Events} value={TransactionIdPageTab.Events} w="100%">
        <Events tx={tx} />
      </TabsContent>
    </>
  );
}
