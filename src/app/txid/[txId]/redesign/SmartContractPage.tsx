import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_LIST_LIMIT } from '@/common/constants/constants';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useAddressConfirmedTxsWithTransfers } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { TabsContent } from '@/ui/Tabs';
import { Grid, Stack } from '@chakra-ui/react';

import {
  MempoolSmartContractTransaction,
  SmartContractTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { getTxAlert } from './Alert';
import { DetailsCard } from './DetailsCard';
import { Events } from './Events';
import { TxHeader } from './TxHeader';
import { TabsContentContainer, TransactionIdPageTab, TxTabs, TxTabsTrigger } from './TxTabs';
import { AvailableFunctions } from './function-called/AvailableFunctions';
import { PostConditions } from './post-conditions/PostConditions';
import { Source } from './source/Source';
import { TxSummary } from './tx-summary/TxSummary';

export const SmartContractPage = ({
  tx,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
}) => {
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

export function SmartContractTabTrigger({
  tx,
  selectedTab,
  setSelectedTab,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
  selectedTab: TransactionIdPageTab;
  setSelectedTab: (tab: TransactionIdPageTab) => void;
}) {
  let { data } = useAddressConfirmedTxsWithTransfers(
    'smart_contract' in tx ? tx.smart_contract.contract_id : '',
    DEFAULT_LIST_LIMIT,
    0,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
      enabled: 'smart_contract' in tx && !!tx.smart_contract?.contract_id, // Disabling this query if tx is not a smart contract tx
    }
  );
  const txCount = data?.total || 0;
  const numPostConditions = tx.post_conditions.length || 0;

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
        key={TransactionIdPageTab.AvailableFunctions}
        label={'Available functions'}
        value={TransactionIdPageTab.AvailableFunctions}
        isActive={selectedTab === TransactionIdPageTab.AvailableFunctions}
        onClick={() => setSelectedTab(TransactionIdPageTab.AvailableFunctions)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.Transactions}
        label={`Transactions ${txCount > 0 ? `(${txCount})` : ''}`}
        value={TransactionIdPageTab.Transactions}
        isActive={selectedTab === TransactionIdPageTab.Transactions}
        onClick={() => setSelectedTab(TransactionIdPageTab.Transactions)}
      />
      <TxTabsTrigger
        key={TransactionIdPageTab.PostConditions}
        label={`Post-conditions ${numPostConditions > 0 ? `(${numPostConditions})` : ''}`}
        value={TransactionIdPageTab.PostConditions}
        isActive={selectedTab === TransactionIdPageTab.PostConditions}
        onClick={() => setSelectedTab(TransactionIdPageTab.PostConditions)}
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

export function SmartContractTabContent({
  tx,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
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
        key={TransactionIdPageTab.AvailableFunctions}
        value={TransactionIdPageTab.AvailableFunctions}
        w="100%"
      >
        <AvailableFunctions tx={tx} />
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.Transactions}
        value={TransactionIdPageTab.Transactions}
        w="100%"
      >
        <AddressTxsTable principal={tx.smart_contract?.contract_id} initialData={undefined} />
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.PostConditions}
        value={TransactionIdPageTab.PostConditions}
        w="100%"
      >
        <PostConditions tx={tx} />
      </TabsContent>
      <TabsContent key={TransactionIdPageTab.Events} value={TransactionIdPageTab.Events} w="100%">
        <TabsContentContainer>
          <Events tx={tx} />
        </TabsContentContainer>
      </TabsContent>
      <TabsContent key="sourceCode" value="sourceCode" w="100%">
        <Source tx={tx} />
      </TabsContent>
    </>
  );
}
