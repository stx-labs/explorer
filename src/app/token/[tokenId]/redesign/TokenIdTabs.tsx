import { TxTabsTrigger } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressTxsTable,
  columnDefinitionsWithEvents,
} from '@/common/components/table/table-examples/AddressTxsTable';
import { HoldersTable } from '@/common/components/table/table-examples/HoldersTable';
import {
  DEFAULT_ADDRESS_TXS_LIMIT,
  DEFAULT_HOLDERS_TABLE_PAGE_SIZE,
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

  const { initialAddressRecentTransactionsData, tokenId, assetId, tokenData, holders } =
    useTokenIdPageData();
  const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;
  const totalHolders = holders?.total || 0;

  // Type guard to ensure tokenData has required properties for holders tab
  const hasRequiredHoldersData = (
    data: typeof tokenData
  ): data is typeof tokenData & { totalSupply: number; decimals: number } => {
    return Boolean(
      data && typeof data.totalSupply === 'number' && typeof data.decimals === 'number'
    );
  };

  const showHoldersTab = assetId && hasRequiredHoldersData(tokenData);

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
          {showHoldersTab && (
            <TxTabsTrigger
              label="Holders"
              secondaryLabel={totalHolders > 0 ? `(${totalHolders.toLocaleString()})` : ''}
              value={TokenIdPageTab.Holders}
              isActive={selectedTab === TokenIdPageTab.Holders}
              onClick={() => setSelectedTab(TokenIdPageTab.Holders)}
            />
          )}
        </TabsList>
      </ScrollIndicator>
      <TabsContent value={TokenIdPageTab.Overview} w="100%">
        <TokenIdOverview />
      </TabsContent>
      <TabsContent value={TokenIdPageTab.Transactions} w="100%">
        <AddressTxsTable
          principal={tokenId}
          pageSize={DEFAULT_ADDRESS_TXS_LIMIT}
          columnDefinitions={columnDefinitionsWithEvents}
        />
      </TabsContent>
      {showHoldersTab && (
        <TabsContent value={TokenIdPageTab.Holders} w="100%">
          <HoldersTable
            assetId={assetId}
            totalSupply={tokenData.totalSupply}
            decimals={tokenData.decimals}
            pageSize={DEFAULT_HOLDERS_TABLE_PAGE_SIZE}
          />
        </TabsContent>
      )}
    </TabsRoot>
  );
};
