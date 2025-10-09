import { TxTabsTrigger } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressTxsTable,
  EVENTS_COLUMN_DEFINITION,
  defaultColumnDefinitions,
} from '@/common/components/table/table-examples/AddressTxsTable';
import { ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { AddressOverview } from './AddressOverview';

enum AddressIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
}

const TransactionsTabAddressTxsTableColumnDefinitions = [
  ...defaultColumnDefinitions,
  EVENTS_COLUMN_DEFINITION,
];

export const AddressTabs = ({ principal }: { principal: string }) => {
  const [selectedTab, setSelectedTab] = useState(AddressIdPageTab.Overview);
  const { initialAddressRecentTransactionsData } = useAddressIdPageData();
  const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;

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
          <TxTabsTrigger
            key={AddressIdPageTab.Transactions}
            label={`Transactions`}
            secondaryLabel={
              totalAddressTransactions > 0 ? `(${totalAddressTransactions.toLocaleString()})` : ''
            }
            value={AddressIdPageTab.Transactions}
            isActive={selectedTab === AddressIdPageTab.Transactions}
            onClick={() => setSelectedTab(AddressIdPageTab.Transactions)}
          />
        </TabsList>
      </ScrollIndicator>
      <TabsContent key={AddressIdPageTab.Overview} value={AddressIdPageTab.Overview} w="100%">
        <AddressOverview />
      </TabsContent>
      <TabsContent key={AddressIdPageTab.Transactions} value={AddressIdPageTab.Transactions}>
        <AddressTxsTable
          principal={principal}
          pageSize={ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT}
          columnDefinitions={TransactionsTabAddressTxsTableColumnDefinitions}
        />
      </TabsContent>
    </TabsRoot>
  );
};
