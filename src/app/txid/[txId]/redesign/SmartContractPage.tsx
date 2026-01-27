import { BalanceCard } from '@/app/address/[principal]/redesign/AddressOverview';
import { SectionTabsContentContainer, SectionTabsTrigger } from '@/common/components/SectionTabs';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { SMART_CONTRACT_TX_ID_PAGE_ADDRESS_TXS_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { DEFAULT_LIST_LIMIT } from '@/common/constants/constants';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useAccountBalance } from '@/common/queries/useAccountBalance';
import { useAddressConfirmedTxsWithTransfers } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { TabsContent } from '@/ui/Tabs';
import { Grid, Stack } from '@chakra-ui/react';

import {
  MempoolSmartContractTransaction,
  SmartContractTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { useTxIdPageData } from '../TxIdPageContext';
import { getTxAlert } from './Alert';
import { DetailsCard } from './DetailsCard';
import { Events } from './Events';
import { TxHeader } from './TxHeader';
import { TransactionIdPageTab, TxTabs } from './TxTabs';
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

export function SmartContractTabTriggers({
  tx,
  selectedTab,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
  selectedTab: TransactionIdPageTab;
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
  const { numFunctions } = useTxIdPageData();
  const txCount = data?.total || 0;
  const numPostConditions = tx.post_conditions.length || 0;

  return (
    <>
      <SectionTabsTrigger
        key={TransactionIdPageTab.Overview}
        label="Overview"
        value={TransactionIdPageTab.Overview}
        isActive={selectedTab === TransactionIdPageTab.Overview}
      />
      <SectionTabsTrigger
        key={TransactionIdPageTab.AvailableFunctions}
        label={'Available functions'}
        secondaryLabel={numFunctions ? `(${numFunctions})` : ''}
        value={TransactionIdPageTab.AvailableFunctions}
        isActive={selectedTab === TransactionIdPageTab.AvailableFunctions}
      />
      <SectionTabsTrigger
        key={TransactionIdPageTab.Transactions}
        label={`Transactions ${txCount > 0 ? `(${txCount})` : ''}`}
        value={TransactionIdPageTab.Transactions}
        isActive={selectedTab === TransactionIdPageTab.Transactions}
      />
      <SectionTabsTrigger
        key={TransactionIdPageTab.PostConditions}
        label={`Post-conditions ${numPostConditions > 0 ? `(${numPostConditions})` : ''}`}
        value={TransactionIdPageTab.PostConditions}
        isActive={selectedTab === TransactionIdPageTab.PostConditions}
      />
      <SectionTabsTrigger
        key={TransactionIdPageTab.SourceCode}
        label={'Source code'}
        value={TransactionIdPageTab.SourceCode}
        isActive={selectedTab === TransactionIdPageTab.SourceCode}
      />
    </>
  );
}

export function SmartContractTabContent({
  tx,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
}) {
  const contractId = tx.smart_contract?.contract_id;
  const { tokenPrice } = useGlobalContext();
  const { data: balancesData } = useAccountBalance(contractId);

  return (
    <>
      <TabsContent
        key={TransactionIdPageTab.Overview}
        value={TransactionIdPageTab.Overview}
        w="100%"
      >
        <Grid templateColumns={{ base: '1fr', md: '75% 25%' }} gap={2}>
          <SectionTabsContentContainer>
            <TxSummary tx={tx} />
          </SectionTabsContentContainer>

          <Stack gap={2}>
            <DetailsCard tx={tx as Transaction} />
            <BalanceCard
              balancesData={balancesData}
              stxPrice={tokenPrice.stxPrice}
              btcPrice={tokenPrice.btcPrice}
              showAvailableSection={false}
              principal={contractId}
            />
          </Stack>
        </Grid>
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.AvailableFunctions}
        value={TransactionIdPageTab.AvailableFunctions}
        w="100%"
      >
        <AvailableFunctions contractId={tx.smart_contract?.contract_id} />
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.Transactions}
        value={TransactionIdPageTab.Transactions}
        w="100%"
      >
        <AddressTxsTable
          principal={tx.smart_contract?.contract_id}
          initialData={undefined}
          pageSize={SMART_CONTRACT_TX_ID_PAGE_ADDRESS_TXS_PAGE_SIZE}
        />
      </TabsContent>
      <TabsContent
        key={TransactionIdPageTab.PostConditions}
        value={TransactionIdPageTab.PostConditions}
        w="100%"
      >
        <PostConditions tx={tx} />
      </TabsContent>
      <TabsContent key={TransactionIdPageTab.Events} value={TransactionIdPageTab.Events} w="100%">
        <SectionTabsContentContainer>
          <Events tx={tx} />
        </SectionTabsContentContainer>
      </TabsContent>
      <TabsContent key="sourceCode" value="sourceCode" w="100%">
        <Source contractId={tx.smart_contract?.contract_id} />
      </TabsContent>
    </>
  );
}
