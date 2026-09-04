'use client';

import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import { StakingActivity } from '../StakingActivity';
import { SubpageHeader } from '../SubpageHeader';
import { ACTIVITY_PAGE_LIMIT, ACTIVITY_PAGE_SIZE } from '../consts';
import type { ActivityGroup, StakingActivityEvent } from '../data';
import { bondLabel } from '../utils';

export interface ActivityPageData {
  events: StakingActivityEvent[];
  selectedGroup?: ActivityGroup;
  bondIndex?: number;
}

export function ActivityPageClient({ events, selectedGroup, bondIndex }: ActivityPageData) {
  return (
    <Stack gap={6}>
      <SubpageHeader
        title={
          bondIndex !== undefined
            ? `${bondLabel(bondIndex)} transactions`
            : 'Bitcoin Staking activity'
        }
      />
      <Stack gap={3}>
        <StakingActivity
          events={events}
          selectedGroup={selectedGroup}
          pageSize={ACTIVITY_PAGE_SIZE}
          standalone
          bondIndex={bondIndex}
          txWindow={ACTIVITY_PAGE_LIMIT}
        />

        {bondIndex !== undefined ? (
          <Text textStyle="text-regular-xs" color="textSecondary">
            {bondLabel(bondIndex)} events found among the {ACTIVITY_PAGE_LIMIT} newest staking
            transactions. Older activity is not shown.
          </Text>
        ) : (
          events.length >= ACTIVITY_PAGE_LIMIT && (
            <Text textStyle="text-regular-xs" color="textSecondary">
              Showing recent staking events, not a full historical feed.
            </Text>
          )
        )}
      </Stack>
    </Stack>
  );
}
