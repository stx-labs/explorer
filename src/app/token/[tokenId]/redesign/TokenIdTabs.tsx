import { TxTabsTrigger } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { TokenIdOverview } from './TokenIdOverview';

enum TokenIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Holders = 'holders',
  Source = 'source',
  AvailableFunctions = 'availableFunctions',
}

export const TokenIdTabs = () => {
  const [selectedTab, setSelectedTab] = useState(TokenIdPageTab.Overview);

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
            key={TokenIdPageTab.Overview}
            label="Overview"
            value={TokenIdPageTab.Overview}
            isActive={selectedTab === TokenIdPageTab.Overview}
            onClick={() => setSelectedTab(TokenIdPageTab.Overview)}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent key={TokenIdPageTab.Overview} value={TokenIdPageTab.Overview} w="100%">
        <TokenIdOverview />
      </TabsContent>
    </TabsRoot>
  );
};
