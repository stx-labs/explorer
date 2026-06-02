'use client';

import { useTokenIdPageData } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { SectionTabsTrigger } from '@/common/components/SectionTabs';
import { HoldersTable } from '@/common/components/table/table-examples/HoldersTable';
import { TxsTable, defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { DEFAULT_HOLDERS_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { StxTokenOverview } from './StxTokenOverview';
import { STX_ASSET_ID, STX_DECIMALS } from './consts';

enum StxTokenTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Holders = 'holders',
}

// All native STX transfers are `token_transfer` transactions.
const STX_TX_FILTERS = { transactionType: ['token_transfer'] };

export const StxTokenTabs = () => {
  const [selectedTab, setSelectedTab] = useState(StxTokenTab.Overview);
  const { holders } = useTokenIdPageData();

  const totalHolders = holders?.total || 0;
  const totalSupply = holders?.total_supply ? Number(holders.total_supply) : 0;

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={StxTokenTab.Overview}
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
      lazyMount
    >
      <ScrollIndicator>
        <TabsList>
          <SectionTabsTrigger
            label="Overview"
            value={StxTokenTab.Overview}
            isActive={selectedTab === StxTokenTab.Overview}
            onClick={() => setSelectedTab(StxTokenTab.Overview)}
          />
          <SectionTabsTrigger
            label="Transactions"
            value={StxTokenTab.Transactions}
            isActive={selectedTab === StxTokenTab.Transactions}
            onClick={() => setSelectedTab(StxTokenTab.Transactions)}
          />
          <SectionTabsTrigger
            label="Holders"
            secondaryLabel={totalHolders > 0 ? `(${totalHolders.toLocaleString()})` : ''}
            value={StxTokenTab.Holders}
            isActive={selectedTab === StxTokenTab.Holders}
            onClick={() => setSelectedTab(StxTokenTab.Holders)}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent value={StxTokenTab.Overview} w="100%">
        <StxTokenOverview />
      </TabsContent>
      <TabsContent value={StxTokenTab.Transactions} w="100%">
        <TxsTable
          initialData={undefined}
          filters={STX_TX_FILTERS}
          tableContainer={defaultTableContainer}
        />
      </TabsContent>
      <TabsContent value={StxTokenTab.Holders} w="100%">
        <HoldersTable
          assetId={STX_ASSET_ID}
          totalSupply={totalSupply}
          decimals={STX_DECIMALS}
          pageSize={DEFAULT_HOLDERS_TABLE_PAGE_SIZE}
        />
      </TabsContent>
    </TabsRoot>
  );
};
