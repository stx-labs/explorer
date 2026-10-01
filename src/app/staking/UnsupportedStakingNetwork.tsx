import { Text } from '@/ui/Text';

export const UNSUPPORTED_STAKING_NETWORK =
  'Staking data is unavailable for this network. Select a configured mainnet or testnet API.';

export function UnsupportedStakingNetwork() {
  return (
    <Text role="status" textStyle="text-regular-sm" color="textSecondary">
      {UNSUPPORTED_STAKING_NETWORK}
    </Text>
  );
}
