import { TransactionsTabAddressTxsTableColumnDefinitions } from '@/app/address/[principal]/redesign/AddressTabs';
import { TabTriggerComponent } from '@/app/txid/[txId]/redesign/TxTabs';
import { Source } from '@/app/txid/[txId]/redesign/source/Source';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { HoldersTable } from '@/common/components/table/table-examples/HoldersTable';
import {
  DEFAULT_ADDRESS_TXS_LIMIT,
  DEFAULT_HOLDER_LIMIT,
} from '@/common/components/table/table-examples/consts';
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

  const { initialAddressRecentTransactionsData, tokenId, holders, assetId, redesignTokenData } =
    useTokenIdPageData();
  const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;
  const totalHolders = holders?.total || 0;
  const { circulatingSupply, totalSupply, decimals } = redesignTokenData || {};
  console.log('TokenIdTabs', { redesignTokenData });

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
          <TabTriggerComponent
            key={TokenIdPageTab.Overview}
            label="Overview"
            value={TokenIdPageTab.Overview}
            isActive={selectedTab === TokenIdPageTab.Overview}
            onClick={() => setSelectedTab(TokenIdPageTab.Overview)}
          />
          <TabTriggerComponent
            key={TokenIdPageTab.Transactions}
            label="Transactions"
            secondaryLabel={
              totalAddressTransactions > 0 ? `(${totalAddressTransactions.toLocaleString()})` : ''
            }
            value={TokenIdPageTab.Transactions}
            isActive={selectedTab === TokenIdPageTab.Transactions}
            onClick={() => setSelectedTab(TokenIdPageTab.Transactions)}
          />
          <TabTriggerComponent
            key={TokenIdPageTab.Holders}
            label="Holders"
            secondaryLabel={totalHolders > 0 ? `(${totalHolders.toLocaleString()})` : ''}
            value={TokenIdPageTab.Holders}
            isActive={selectedTab === TokenIdPageTab.Holders}
            onClick={() => setSelectedTab(TokenIdPageTab.Holders)}
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
          columnDefinitions={TransactionsTabAddressTxsTableColumnDefinitions}
        />
      </TabsContent>
      <TabsContent key={TokenIdPageTab.Holders} value={TokenIdPageTab.Holders} w="100%">
        <HoldersTable
          assetId={assetId || ''}
          pageSize={DEFAULT_HOLDER_LIMIT}
          circulatingSupply={circulatingSupply}
          totalSupply={totalSupply}
          decimals={decimals}
        />
      </TabsContent>
    </TabsRoot>
  );
};
