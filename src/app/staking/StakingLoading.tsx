import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

export function StakingLoading({ label = 'Loading staking data…' }: { label?: string }) {
  return (
    <Stack gap={4} aria-busy="true">
      <Text role="status" textStyle="text-regular-sm" color="textSecondary">
        {label}
      </Text>
      <Skeleton height={40} borderRadius="redesign.xl" />
    </Stack>
  );
}
