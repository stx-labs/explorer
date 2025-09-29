import { getIsSBTC } from '@/app/tokens/utils';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { TabTriggerComponent } from '@/common/components/TabsContainer';
import { TabsList, TabsRoot } from '@/ui/Tabs';
import { useState } from 'react';

import { ContractAvailableFunctions } from '../../../../common/components/ContractAvailableFunctions';
import {
  useContractById,
  useSuspenseContractById,
} from '../../../../common/queries/useContractById';
import { AddressConfirmedTxsList } from '../../../../features/txs-list/AddressConfirmedTxsList';
import { AddressMempoolTxsList } from '../../../../features/txs-list/AddressMempoolTxsList';
import { CodeEditor } from '../../../../ui/CodeEditor';
import { TabsRootProps } from '../../../../ui/Tabs';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';
import { sbtcDepositAddress, sbtcWidthdrawlContractAddress } from '../consts';
import { DeveloperData, TokenInfoProps } from '../types';

interface TokenTabsProps extends Partial<TabsRootProps> {
  tokenId: string;
  tokenInfo: TokenInfoProps;
  developerData?: DeveloperData;
}

enum TokenIdPageTab {
  Overview = 'overview',
  Transactions = 'transactions',
  Holders = 'holders',
  Source = 'source',
  AvailableFunctions = 'availableFunctions',
}

export function TokenTabsBase({ tokenId, tokenInfo, developerData }: TokenTabsProps) {
  const { data: contract } = useSuspenseContractById(tokenId);
  const source = contract?.source_code;
  const isSBTC = getIsSBTC(tokenId);
  const { data: sbtcWithdrawalContract } = useContractById(
    isSBTC ? sbtcWidthdrawlContractAddress : undefined
  );

  const [selectedTab, setSelectedTab] = useState<TokenIdPageTab>(TokenIdPageTab.Overview);

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={selectedTab}
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
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
            label={`Transactions`}
            secondaryLabel={numTxs > 0 ? `(${numTxs})` : ''}
            value={TokenIdPageTab.Transactions}
            isActive={selectedTab === TokenIdPageTab.Transactions}
            onClick={() => setSelectedTab(TokenIdPageTab.Transactions)}
          />
          <TabTriggerComponent
            key={TokenIdPageTab.Holders}
            label="Holders"
            secondaryLabel={numHolders > 0 ? `(${numHolders})` : ''}
            value={TokenIdPageTab.Holders}
            isActive={selectedTab === TokenIdPageTab.Holders}
            onClick={() => setSelectedTab(TokenIdPageTab.Holders)}
          />
          <TabTriggerComponent
            key={TokenIdPageTab.Source}
            label="Source"
            value={TokenIdPageTab.Source}
            isActive={selectedTab === TokenIdPageTab.Source}
            onClick={() => setSelectedTab(TokenIdPageTab.Source)}
          />
          <TabTriggerComponent
            key={TokenIdPageTab.AvailableFunctions}
            label="Available Functions"
            secondaryLabel={numFunctions > 0 ? `(${numFunctions})` : ''}
            value={TokenIdPageTab.AvailableFunctions}
            isActive={selectedTab === TokenIdPageTab.AvailableFunctions}
            onClick={() => setSelectedTab(TokenIdPageTab.AvailableFunctions)}
          />
        </TabsList>
      </ScrollIndicator>

      {getTabsContentByTransactionType(tx)}
    </TabsRoot>
  );
}

export function TokenTabs(props: TokenTabsProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <TokenTabsBase {...props} />
    </ExplorerErrorBoundary>
  );
}
