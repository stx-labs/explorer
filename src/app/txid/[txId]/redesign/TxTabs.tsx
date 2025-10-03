import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { ValueBasisFilterPopover } from '@/common/components/table/filters/value-basis-filter/ValueBasisFiterPopover';
import { TabsList, TabsRoot, TabsTrigger } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Flex, Stack, StackProps } from '@chakra-ui/react';
import { useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { ContractCallTabContent, ContractCallTabTrigger } from './ContractCallPage';
import { SmartContractTabContent, SmartContractTabTrigger } from './SmartContractPage';
import { TokenTransferTabContent, TokenTransferTabTrigger } from './TokenTransferPage';

export enum TransactionIdPageTab {
  Overview = 'overview',
  Events = 'events',
  FunctionCall = 'functionCall',
  PostConditions = 'postConditions',
  SourceCode = 'sourceCode',
  AvailableFunctions = 'availableFunctions',
  Transactions = 'transactions',
}
export function TxTabsTrigger({
  label,
  value,
  secondaryLabel,
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  secondaryLabel?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <TabsTrigger
      key={value}
      value={value}
      flex="1"
      w="100%"
      maxW="100%"
      gap={2}
      flexDirection={'column'}
      className={`group`}
      background={isActive ? 'surfacePrimary' : 'none'}
      py={1}
      px={3}
      onClick={onClick}
    >
      <Flex gap={1} alignItems="center">
        <Text
          textStyle="heading-xs"
          color={isActive ? 'textPrimary' : 'textSecondary'}
          _groupHover={{
            color: isActive ? 'textPrimary' : 'textPrimary',
          }}
        >
          {label}
        </Text>
        {secondaryLabel && (
          <Text
            textStyle="heading-xs"
            color={isActive ? 'textSecondary' : 'textTertiary'}
            _groupHover={{
              color: isActive ? 'textSecondary' : 'textSecondary',
            }}
          >
            {secondaryLabel}
          </Text>
        )}
      </Flex>
    </TabsTrigger>
  );
}

export function TabsContentContainer({
  children,
  ...stackProps
}: { children: React.ReactNode } & StackProps) {
  return (
    <Stack
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
      p={3}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}

function TxTabsTriggers({
  tx,
  selectedTab,
  setSelectedTab,
}: {
  tx: Transaction | MempoolTransaction;
  selectedTab: TransactionIdPageTab;
  setSelectedTab: (tab: TransactionIdPageTab) => void;
}) {
  if (tx.tx_type === 'token_transfer') {
    return (
      <TokenTransferTabTrigger tx={tx} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
    );
  }
  if (tx.tx_type === 'contract_call') {
    return (
      <ContractCallTabTrigger tx={tx} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
    );
  }
  if (tx.tx_type === 'coinbase') {
    return null;
  }
  if (tx.tx_type === 'tenure_change') {
    return null;
  }
  if (tx.tx_type === 'smart_contract') {
    return (
      <SmartContractTabTrigger tx={tx} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
    );
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
  const [selectedTab, setSelectedTab] = useState(TransactionIdPageTab.Overview);

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={TransactionIdPageTab.Overview}
      gap={2}
      rowGap={2}
      borderRadius="redesign.xl"
      w="full"
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
            <TxTabsTriggers tx={tx} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
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
