'use client';

import { SectionTabsContentContainer } from '@/common/components/SectionTabs';
import { Stack } from '@chakra-ui/react';
import { useSearchParams } from 'next/navigation';

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
  // `?highlight=<index>` is set by the "Why it failed" card to point at the implicated condition.
  const highlightParam = useSearchParams().get('highlight');
  const highlightIndex = highlightParam !== null ? Number(highlightParam) : undefined;
  return (
    <Stack gap={1}>
      <SectionTabsContentContainer>
        <PostConditionsHeader postConditionMode={mode} />
      </SectionTabsContentContainer>
      <SectionTabsContentContainer>
        <PostConditionsTable
          tx={tx}
          highlightIndex={Number.isInteger(highlightIndex) ? highlightIndex : undefined}
        />
      </SectionTabsContentContainer>
    </Stack>
  );
}
