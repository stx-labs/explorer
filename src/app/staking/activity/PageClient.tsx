'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { PageTitle } from '../../_components/PageTitle';
import { BackLink } from '../BackLink';
import { StakingActivity } from '../StakingActivity';
import { ACTIVITY_PAGE_LIMIT, ACTIVITY_PAGE_SIZE } from '../consts';
import { StakingActivityEvent } from '../data';

export interface ActivityPageData {
  events: StakingActivityEvent[];
  selectedGroup?: string;
  /** Set when the feed is narrowed to a single bond. */
  bondIndex?: number;
}

export function ActivityPageClient({ events, selectedGroup, bondIndex }: ActivityPageData) {
  const network = useGlobalContext().activeNetwork;
  return (
    <Stack gap={6}>
      <Stack gap={4}>
        <BackLink href={buildUrl('/staking', network)}>Staking</BackLink>
        <PageTitle>
          {bondIndex !== undefined ? `Bond ${bondIndex} transactions` : 'Bitcoin Staking activity'}
        </PageTitle>
      </Stack>
      <Stack gap={3}>
        <StakingActivity
          events={events}
          selectedGroup={selectedGroup}
          pageSize={ACTIVITY_PAGE_SIZE}
          showViewAll={false}
        />
        {/*
          The feed merges several contract functions, and the transaction
          endpoint pages each one separately rather than the merged result, so
          there is no offset that means "older than this" across the whole feed.
          Saying so is better than pagination that quietly stops.
        */}
        {events.length >= ACTIVITY_PAGE_LIMIT && (
          <Flex justify="flex-start">
            <Text textStyle="text-regular-xs" color="textSecondary">
              Showing recent staking events, not a full historical feed.
            </Text>
          </Flex>
        )}
      </Stack>
    </Stack>
  );
}
