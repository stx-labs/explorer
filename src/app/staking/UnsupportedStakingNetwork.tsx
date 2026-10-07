import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

export const UNSUPPORTED_STAKING_NETWORK =
  'Staking data is unavailable for this network. Select a configured mainnet or testnet API.';

export function UnsupportedStakingNetwork() {
  return (
    <Stack gap={6}>
      <Text as="h1" textStyle="heading-md" color="textPrimary">
        Bitcoin Staking
      </Text>
      <Text role="status" textStyle="text-regular-sm" color="textSecondary">
        {UNSUPPORTED_STAKING_NETWORK}
      </Text>
    </Stack>
  );
}
