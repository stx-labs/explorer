import { SBTCToken } from '@/common/components/SBTCToken';
import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { getFtDecimalAdjustedBalance } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Box, Stack } from '@chakra-ui/react';

import { useTokenIdPageData } from './context/TokenIdPageContext';

function ClusterOfTokens() {
  return (
    <Box position="absolute" bottom={0} right={0}>
      <SBTCToken
        h={'56px'}
        w={'56px'}
        color="accent.bitcoin-500"
        position="absolute"
        bottom={0}
        right={0}
        transformOrigin="center"
        transform="rotate(10deg)"
      />
      <SBTCToken
        h={'56px'}
        w={'56px'}
        color="accent.bitcoin-500"
        position="absolute"
        bottom={0}
        right={'56px'}
        transformOrigin="center"
        transform="rotate(-55deg)"
      />
      <SBTCToken
        h={'42px'}
        w={'42px'}
        color="accent.bitcoin-500"
        position="absolute"
        bottom={0}
        right={'111px'}
        transformOrigin="center"
        transform="rotate(0deg)"
      />
      <SBTCToken
        h={'34px'}
        w={'34px'}
        color="accent.bitcoin-500"
        position="absolute"
        bottom={'46px'}
        right={'39px'}
        transformOrigin="center"
        transform="rotate(-50deg)"
      />
      <SBTCToken
        h={'42px'}
        w={'42px'}
        color="accent.bitcoin-500"
        position="absolute"
        bottom={'55px'}
        right={0}
        transformOrigin="center"
        transform="rotate(10deg)"
      />
    </Box>
  );
}

export function TotalSupplyCard() {
  const { tokenData } = useTokenIdPageData();
  const { totalSupply, marketCap, decimals } = tokenData || {};
  const adjustedTotalSupply =
    totalSupply && decimals !== undefined
      ? formatNumber(getFtDecimalAdjustedBalance(totalSupply, decimals), 0, 2)
      : undefined;

  const adjustedMarketCap = marketCap ? formatUsdValue(marketCap) : undefined;

  return (
    <Stack
      gap={1}
      p={5}
      borderColor="redesignBorderSecondary"
      borderWidth={1}
      borderRadius="30px"
      position="relative"
    >
      <Text textStyle="text-medium-lg" color="textPrimary">
        Total supply
      </Text>
      <Text textStyle="heading-md" fontWeight="medium" color="textPrimary">
        {adjustedTotalSupply} sBTC
      </Text>
      <Text textStyle="text-medium-xl" color="textSecondary" fontFamily="matter">
        ({adjustedMarketCap})
      </Text>
      <ClusterOfTokens />
    </Stack>
  );
}
