import { TxTabsTrigger } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { AddressOverview } from './AddressOverview';

enum AddressIdPageTab {
  Overview = 'overview',
}

export const AddressTabs = ({ principal }: { principal: string }) => {
  const [selectedTab, setSelectedTab] = useState(AddressIdPageTab.Overview);

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={AddressIdPageTab.Overview}
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
      lazyMount // needed to reduce the number of requests made to the API
    >
      <ScrollIndicator>
        <TabsList>
          <TxTabsTrigger
            key={AddressIdPageTab.Overview}
            label="Overview"
            value={AddressIdPageTab.Overview}
            isActive={selectedTab === AddressIdPageTab.Overview}
            onClick={() => setSelectedTab(AddressIdPageTab.Overview)}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent key={AddressIdPageTab.Overview} value={AddressIdPageTab.Overview} w="100%">
        <AddressOverview />
      </TabsContent>
    </TabsRoot>
  );
};
