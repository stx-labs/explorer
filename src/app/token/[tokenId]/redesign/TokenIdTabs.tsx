import { TxTabsTrigger } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressTxsTable,
  columnDefinitionsWithEvents,
} from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { TokenIdOverview } from './TokenIdOverview';
import { useTokenIdPageData } from './context/TokenIdPageContext';

enum TokenIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Holders = 'holders',
  Source = 'source',
  AvailableFunctions = 'availableFunctions',
}

export const TokenIdTabs = () => {
  const [selectedTab, setSelectedTab] = useState(TokenIdPageTab.Overview);

  const { initialAddressRecentTransactionsData, tokenId } = useTokenIdPageData();
  const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={TokenIdPageTab.Overview}
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
      lazyMount // needed to reduce the number of requests made to the API
    >
      <ScrollIndicator>
        <TabsList>
          <TxTabsTrigger
            label="Overview"
            value={TokenIdPageTab.Overview}
            isActive={selectedTab === TokenIdPageTab.Overview}
            onClick={() => setSelectedTab(TokenIdPageTab.Overview)}
          />
          <TxTabsTrigger
            label="Transactions"
            secondaryLabel={
              totalAddressTransactions > 0 ? `(${totalAddressTransactions.toLocaleString()})` : ''
            }
            value={TokenIdPageTab.Transactions}
            isActive={selectedTab === TokenIdPageTab.Transactions}
            onClick={() => setSelectedTab(TokenIdPageTab.Transactions)}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent key={TokenIdPageTab.Overview} value={TokenIdPageTab.Overview} w="100%">
        <TokenIdOverview />
      </TabsContent>
      <TabsContent key={TokenIdPageTab.Transactions} value={TokenIdPageTab.Transactions} w="100%">
        <AddressTxsTable
          principal={tokenId}
          pageSize={DEFAULT_ADDRESS_TXS_LIMIT}
          columnDefinitions={columnDefinitionsWithEvents}
        />
      </TabsContent>
    </TabsRoot>
  );
};
