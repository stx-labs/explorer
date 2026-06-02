'use client';

import { useTokenIdPageData } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  SectionTabsTrigger,
  mapTabParamToEnum,
  useDeepLinkTabOnValueChange,
} from '@/common/components/SectionTabs';
import { HoldersTable } from '@/common/components/table/table-examples/HoldersTable';
import { TxsTable, defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { DEFAULT_HOLDERS_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { StxTokenOverview } from './StxTokenOverview';
import { STX_ASSET_ID, STX_DECIMALS, STX_TX_FILTERS } from './consts';

enum StxTokenTab {
  Overview = 'overview',
  Transfers = 'transfers',
  Holders = 'holders',
}

export const StxTokenTabs = () => {
  const { holders } = useTokenIdPageData();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = useMemo(
    () =>
      mapTabParamToEnum<StxTokenTab>(
        tabParam,
        Object.values(StxTokenTab) as readonly StxTokenTab[],
        StxTokenTab.Overview
      ),
    []
  );
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const deepLinkTabOnValueChange = useDeepLinkTabOnValueChange<StxTokenTab>({ setSelectedTab });

  const totalHolders = holders?.total || 0;
  const totalSupply = holders?.total_supply ? Number(holders.total_supply) : 0;

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      value={selectedTab}
      onValueChange={({ value }) => deepLinkTabOnValueChange(value as StxTokenTab)}
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
          />
          <SectionTabsTrigger
            label="Transfers"
            value={StxTokenTab.Transfers}
            isActive={selectedTab === StxTokenTab.Transfers}
          />
          <SectionTabsTrigger
            label="Holders"
            secondaryLabel={totalHolders > 0 ? `(${totalHolders.toLocaleString()})` : ''}
            value={StxTokenTab.Holders}
            isActive={selectedTab === StxTokenTab.Holders}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent value={StxTokenTab.Overview} w="100%">
        <StxTokenOverview />
      </TabsContent>
      <TabsContent value={StxTokenTab.Transfers} w="100%">
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
