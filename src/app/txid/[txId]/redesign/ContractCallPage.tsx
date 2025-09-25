import { isConfirmedTx } from '@/common/utils/transactions';
import { TabsContent } from '@/ui/Tabs';
import { Grid, Stack } from '@chakra-ui/react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { getTxAlert } from './Alert';
import { DetailsCard } from './DetailsCard';
import { Events } from './Events';
import { TxHeader } from './TxHeader';
import { TabsContentContainer, TransactionIdPageTab, TxTabs, TxTabsTrigger } from './TxTabs';
import { FunctionCalled } from './function-called/FunctionCalled';
import { PostConditions } from './post-conditions/PostConditions';
import { Source } from './source/Source';
import { TxSummary } from './tx-summary/TxSummary';

export const ContractCallPage = ({ tx }: { tx: Transaction | MempoolTransaction }) => {
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

export function ContractCallTabTrigger({
  tx,
  selectedTab,
  setSelectedTab,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
  selectedTab: TransactionIdPageTab;
  setSelectedTab: (tab: TransactionIdPageTab) => void;
}) {
  const numPostConditions = tx.post_conditions.length || 0;
  const numTxEvents = isConfirmedTx<ContractCallTransaction, MempoolContractCallTransaction>(tx)
    ? tx.event_count
    : 0;

  return (
    <>
      <TxTabsTrigger
        key={TransactionIdPageTab.Overview}
        label="Overview"
        value={TransactionIdPageTab.Overview}
        isActive={selectedTab === TransactionIdPageTab.Overview}
        onClick={() => setSelectedTab(TransactionIdPageTab.Overview)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.FunctionCall}
        label={'Function called'}
        value={TransactionIdPageTab.FunctionCall}
        isActive={selectedTab === TransactionIdPageTab.FunctionCall}
        onClick={() => setSelectedTab(TransactionIdPageTab.FunctionCall)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.PostConditions}
        label={`Post-conditions`}
        secondaryLabel={numPostConditions > 0 ? `(${numPostConditions})` : ''}
        value={TransactionIdPageTab.PostConditions}
        isActive={selectedTab === TransactionIdPageTab.PostConditions}
        onClick={() => setSelectedTab(TransactionIdPageTab.PostConditions)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.Events}
        label={`Events`}
        secondaryLabel={numTxEvents > 0 ? `(${numTxEvents})` : ''}
        value={TransactionIdPageTab.Events}
        isActive={selectedTab === TransactionIdPageTab.Events}
        onClick={() => setSelectedTab(TransactionIdPageTab.Events)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.SourceCode}
        label={'Source code'}
        value={TransactionIdPageTab.SourceCode}
        isActive={selectedTab === TransactionIdPageTab.SourceCode}
        onClick={() => setSelectedTab(TransactionIdPageTab.SourceCode)}
      />
    </>
  );
}

export function ContractCallTabContent({
  tx,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
}) {
  return (
    <>
      <TabsContent
        key={TransactionIdPageTab.Overview}
        value={TransactionIdPageTab.Overview}
        w="100%"
      >
        <Grid templateColumns={{ base: '1fr', md: '75% 25%' }} gap={2}>
          <TabsContentContainer>
            <TxSummary tx={tx} />
          </TabsContentContainer>
          <DetailsCard tx={tx as Transaction} />
        </Grid>
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.FunctionCall}
        value={TransactionIdPageTab.FunctionCall}
        w="100%"
      >
        <FunctionCalled tx={tx} />
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.PostConditions}
        value={TransactionIdPageTab.PostConditions}
        w="100%"
      >
        <PostConditions tx={tx} />
      </TabsContent>
      <TabsContent key={TransactionIdPageTab.Events} value={TransactionIdPageTab.Events} w="100%">
        <Events tx={tx} />
      </TabsContent>
      <TabsContent key="sourceCode" value="sourceCode" w="100%">
        <Source contractId={tx.contract_call.contract_id} />
      </TabsContent>
    </>
  );
}
