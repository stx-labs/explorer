import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { mapTabParamToEnum, useDeepLinkTabOnValueChange } from '@/common/components/SectionTabs';
import { ValueBasisFilterPopover } from '@/common/components/table/filters/value-basis-filter/ValueBasisFiterPopover';
import { TabsList, TabsRoot } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Flex } from '@chakra-ui/react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { ContractCallTabContent, ContractCallTabTriggers } from './ContractCallPage';
import { SmartContractTabContent, SmartContractTabTriggers } from './SmartContractPage';
import { TokenTransferTabContent, TokenTransferTabTriggers } from './TokenTransferPage';

export enum TransactionIdPageTab {
  Overview = 'overview',
  Events = 'events',
  FunctionCall = 'functionCall',
  PostConditions = 'postConditions',
  SourceCode = 'sourceCode',
  AvailableFunctions = 'availableFunctions',
  Transactions = 'transactions',
}

function TxTabsTriggers({
  tx,
  selectedTab,
}: {
  tx: Transaction | MempoolTransaction;
  selectedTab: TransactionIdPageTab;
}) {
  if (tx.tx_type === 'token_transfer') {
    return <TokenTransferTabTriggers tx={tx} selectedTab={selectedTab} />;
  }
  if (tx.tx_type === 'contract_call') {
    return <ContractCallTabTriggers tx={tx} selectedTab={selectedTab} />;
  }
  if (tx.tx_type === 'coinbase') {
    return null;
  }
  if (tx.tx_type === 'tenure_change') {
    return null;
  }
  if (tx.tx_type === 'smart_contract') {
    return <SmartContractTabTriggers tx={tx} selectedTab={selectedTab} />;
  }
  return null;
}

function TxTabsContent({ tx }: { tx: Transaction | MempoolTransaction }) {
  if (tx.tx_type === 'token_transfer') {
    return <TokenTransferTabContent tx={tx} />;
  }
  if (tx.tx_type === 'contract_call') {
    return <ContractCallTabContent tx={tx} />;
  }
  if (tx.tx_type === 'coinbase') {
    return null;
  }
  if (tx.tx_type === 'tenure_change') {
    return null;
  }
  if (tx.tx_type === 'smart_contract') {
    return <SmartContractTabContent tx={tx} />;
  }
  return null;
}

export const TxTabs = ({ tx }: { tx: Transaction | MempoolTransaction }) => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = useMemo(
    () =>
      mapTabParamToEnum<TransactionIdPageTab>(
        tabParam,
        Object.values(TransactionIdPageTab) as readonly TransactionIdPageTab[],
        TransactionIdPageTab.Overview
      ),
    []
  );
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const deepLinkTabOnValueChange = useDeepLinkTabOnValueChange<TransactionIdPageTab>({
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
        deepLinkTabOnValueChange(value as TransactionIdPageTab);
      }}
    >
      <Flex
        justifyContent={'space-between'}
        w="full"
        gap={2}
        flexDirection={{ base: 'column', sm: 'row' }}
        rowGap={2}
      >
        <ScrollIndicator>
          <TabsList>
            <TxTabsTriggers tx={tx} selectedTab={selectedTab} />
          </TabsList>
        </ScrollIndicator>

        {tx.tx_type === 'token_transfer' && (
          <Flex alignItems={'center'} gap={2}>
            <Text textStyle="text-regular-sm">Show:</Text>
            <ValueBasisFilterPopover />
          </Flex>
        )}
      </Flex>
      <TxTabsContent tx={tx} />
    </TabsRoot>
  );
};
