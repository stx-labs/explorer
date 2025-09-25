import { TabTriggerComponent } from '@/app/txid/[txId]/redesign/TxTabs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { FungibleTokensTableWithFilters } from '@/common/components/table/fungible-tokens-table/FungibleTokensTableWithFilters';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import {
  EVENTS_COLUMN_DEFINITION,
  defaultColumnDefinitions,
} from '@/common/components/table/table-examples/AddressTxsTable';
import {
  ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT,
  ADDRESS_ID_PAGE_FUNGIBLE_TOKENS_LIMIT,
} from '@/common/components/table/table-examples/consts';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { AddressOverview } from './AddressOverview';
import { NFTTable } from './NFTTable';

enum AddressIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Tokens = 'tokens',
  Collectibles = 'collectibles',
}

const TransactionsTabAddressTxsTableColumnDefinitions = [
  ...defaultColumnDefinitions,
  EVENTS_COLUMN_DEFINITION,
];

export const AddressTabs = ({ principal }: { principal: string }) => {
  const [selectedTab, setSelectedTab] = useState(AddressIdPageTab.Overview);
  const { initialAddressRecentTransactionsData, initialAddressBalancesData } =
    useAddressIdPageData();
  const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;
  const totalAddressFungibleTokens = Object.entries(
    initialAddressBalancesData?.fungible_tokens || {}
  ).filter(([assetId, balance]) => parseFloat(balance?.balance || '0') > 0).length;
  const totalAddressNonFungibleTokens = Object.entries(
    initialAddressBalancesData?.non_fungible_tokens || {}
  ).filter(([assetId, nftBalance]) => parseFloat(nftBalance?.count || '0') > 0).length;

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
          <TabTriggerComponent
            key={AddressIdPageTab.Overview}
            label="Overview"
            value={AddressIdPageTab.Overview}
            isActive={selectedTab === AddressIdPageTab.Overview}
            onClick={() => setSelectedTab(AddressIdPageTab.Overview)}
          />
          <TabTriggerComponent
            key={AddressIdPageTab.Transactions}
            label={`Transactions`}
            secondaryLabel={
              totalAddressTransactions > 0 ? `(${totalAddressTransactions.toLocaleString()})` : ''
            }
            value={AddressIdPageTab.Transactions}
            isActive={selectedTab === AddressIdPageTab.Transactions}
            onClick={() => setSelectedTab(AddressIdPageTab.Transactions)}
          />
          {totalAddressFungibleTokens > 0 && (
            <TabTriggerComponent
              key={AddressIdPageTab.Tokens}
              label={`Tokens`}
              secondaryLabel={
                totalAddressFungibleTokens > 0
                  ? `(${totalAddressFungibleTokens.toLocaleString()})`
                  : ''
              }
              value={AddressIdPageTab.Tokens}
              isActive={selectedTab === AddressIdPageTab.Tokens}
              onClick={() => setSelectedTab(AddressIdPageTab.Tokens)}
            />
          )}
          {totalAddressNonFungibleTokens > 0 && (
            <TabTriggerComponent
              key={AddressIdPageTab.Collectibles}
              label={`Collectibles`}
              secondaryLabel={
                totalAddressNonFungibleTokens > 0
                  ? `(${totalAddressNonFungibleTokens.toLocaleString()})`
                  : ''
              }
              value={AddressIdPageTab.Collectibles}
              isActive={selectedTab === AddressIdPageTab.Collectibles}
              onClick={() => setSelectedTab(AddressIdPageTab.Collectibles)}
            />
          )}
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
      <TabsContent key={AddressIdPageTab.Tokens} value={AddressIdPageTab.Tokens}>
        <FungibleTokensTableWithFilters
          principal={principal}
          pageSize={ADDRESS_ID_PAGE_FUNGIBLE_TOKENS_LIMIT}
        />
      </TabsContent>
      <TabsContent key={AddressIdPageTab.Collectibles} value={AddressIdPageTab.Collectibles}>
        <NFTTable />
      </TabsContent>
    </TabsRoot>
  );
};
