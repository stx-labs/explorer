import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  SectionTabsTrigger,
  mapTabParamToEnum,
  useDeepLinkTabOnValueChange,
} from '@/common/components/SectionTabs';
import { FungibleTokensTableWithFilters } from '@/common/components/table/fungible-tokens-table/FungibleTokensTableWithFilters';
import {
  AddressTxsTable,
  columnDefinitionsWithEvents,
} from '@/common/components/table/table-examples/AddressTxsTable';
import {
  ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT,
  ADDRESS_ID_PAGE_FUNGIBLE_TOKENS_LIMIT,
} from '@/common/components/table/table-examples/consts';
import { useAddressTxs } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { TabsContent, TabsList, TabsRoot } from '@/ui/Tabs';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { AddressOverview } from './AddressOverview';
import { NFTTable } from './NFTTable';

enum AddressIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Tokens = 'tokens',
  Collectibles = 'collectibles',
}

export const AddressTabs = ({ principal }: { principal: string }) => {
  // TODO: Temporarily disabled - re-enable when API performance is fixed
  // const { initialAddressRecentTransactionsData, initialAddressBalancesData } =
  //   useAddressIdPageData();
  // const totalAddressTransactions = initialAddressRecentTransactionsData?.total || 0;
  const { initialAddressBalancesData } = useAddressIdPageData();

  // TODO: Temporarily fetching client-side - re-enable SSR when API performance is fixed
  const { data: transactionsData } = useAddressTxs(principal, 1, 0);
  const totalAddressTransactions = transactionsData?.total || 0;

  const totalAddressFungibleTokens = Object.entries(
    initialAddressBalancesData?.fungible_tokens || {}
  ).length;
  const totalAddressNonFungibleTokens = Object.entries(
    initialAddressBalancesData?.non_fungible_tokens || {}
  ).reduce((acc, [_, nft]) => acc + (Number(nft?.count) || 0), 0);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = useMemo(
    () =>
      mapTabParamToEnum<AddressIdPageTab>(
        tabParam,
        Object.values(AddressIdPageTab) as readonly AddressIdPageTab[],
        AddressIdPageTab.Overview
      ),
    []
  );
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const deepLinkTabOnValueChange = useDeepLinkTabOnValueChange<AddressIdPageTab>({
    setSelectedTab,
  });

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
      lazyMount
      value={selectedTab}
      onValueChange={({ value }) => {
        deepLinkTabOnValueChange(value as AddressIdPageTab);
      }}
    >
      <ScrollIndicator>
        <TabsList>
          <SectionTabsTrigger
            key={AddressIdPageTab.Overview}
            label="Overview"
            value={AddressIdPageTab.Overview}
            isActive={selectedTab === AddressIdPageTab.Overview}
          />
          {totalAddressTransactions > 0 && (
            <SectionTabsTrigger
              key={AddressIdPageTab.Transactions}
              label={`Transactions`}
              secondaryLabel={`(${totalAddressTransactions.toLocaleString()})`}
              value={AddressIdPageTab.Transactions}
              isActive={selectedTab === AddressIdPageTab.Transactions}
            />
          )}
          {totalAddressFungibleTokens > 0 && (
            <SectionTabsTrigger
              key={AddressIdPageTab.Tokens}
              label={`Tokens`}
              secondaryLabel={`(${totalAddressFungibleTokens.toLocaleString()})`}
              value={AddressIdPageTab.Tokens}
              isActive={selectedTab === AddressIdPageTab.Tokens}
            />
          )}
          {totalAddressNonFungibleTokens > 0 && (
            <SectionTabsTrigger
              key={AddressIdPageTab.Collectibles}
              label={`Collectibles`}
              secondaryLabel={`(${totalAddressNonFungibleTokens.toLocaleString()})`}
              value={AddressIdPageTab.Collectibles}
              isActive={selectedTab === AddressIdPageTab.Collectibles}
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
          columnDefinitions={columnDefinitionsWithEvents}
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
