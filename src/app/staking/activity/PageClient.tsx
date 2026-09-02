'use client';

import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import { StakingActivity } from '../StakingActivity';
import { SubpageHeader } from '../SubpageHeader';
import { ACTIVITY_PAGE_LIMIT, ACTIVITY_PAGE_SIZE } from '../consts';
import { StakingActivityEvent } from '../data';

export interface ActivityPageData {
  events: StakingActivityEvent[];
  selectedGroup?: string;
  /** Set when the feed is narrowed to a single bond. */
  bondIndex?: number;
}

export function ActivityPageClient({ events, selectedGroup, bondIndex }: ActivityPageData) {
  return (
    <Stack gap={6}>
      <SubpageHeader
        title={
          bondIndex !== undefined ? `Bond ${bondIndex} transactions` : 'Bitcoin Staking activity'
        }
      />
      <Stack gap={3}>
        <StakingActivity
          events={events}
          selectedGroup={selectedGroup}
          pageSize={ACTIVITY_PAGE_SIZE}
          standalone
        />
        {/*
          The feed merges several contract functions, and the transaction
          endpoint pages each one separately rather than the merged result, so
          there is no offset that means "older than this" across the whole feed.
          Saying so is better than pagination that quietly stops.
        */}
        {events.length >= ACTIVITY_PAGE_LIMIT && (
          <Text textStyle="text-regular-xs" color="textSecondary">
            Showing recent staking events, not a full historical feed.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
