'use client';

import { SectionTabsContentContainer } from '@/common/components/SectionTabs';
import { Stack } from '@chakra-ui/react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { PostConditionsHeader } from './PostConditionsHeader';
import { PostConditionsTable } from './PostConditionsTable';

export function PostConditions({
  tx,
}: {
  tx:
    | ContractCallTransaction
    | MempoolContractCallTransaction
    | SmartContractTransaction
    | MempoolSmartContractTransaction;
}) {
  const { post_condition_mode: mode } = tx;
  return (
    <Stack gap={1}>
      <SectionTabsContentContainer>
        <PostConditionsHeader postConditionMode={mode} />
      </SectionTabsContentContainer>
      <SectionTabsContentContainer>
        <PostConditionsTable tx={tx} />
      </SectionTabsContentContainer>
    </Stack>
  );
}
