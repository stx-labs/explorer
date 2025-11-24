import { useTokenIdPageData } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { getFtDecimalAdjustedBalance } from '@/common/utils/utils';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, FlexProps, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight, TrendDown, TrendUp } from '@phosphor-icons/react';
import { ReactNode } from 'react';

export function TokenStats() {
  const { tokenData, holders } = useTokenIdPageData();
  const {
    marketCap,
    totalSupply,
    circulatingSupply,
    currentPrice,
    decimals,
    tradingVolume24h,
    priceChangePercentage24h,
  } = tokenData || {};

  const adjustedCirculatingSupply =
    holders?.total_supply && decimals !== undefined
      ? formatNumber(getFtDecimalAdjustedBalance(holders?.total_supply, decimals), 0, 2)
      : undefined;

  const adjustedTotalSupply =
    totalSupply && decimals !== undefined
      ? formatNumber(getFtDecimalAdjustedBalance(totalSupply, decimals), 0, 2)
      : undefined;

  const adjustedHolders = holders?.total ? formatNumber(holders.total) : undefined;
  const adjustedPrice = currentPrice ? formatUsdValue(currentPrice) : undefined;
  const adjustedMarketCap = marketCap ? formatUsdValue(marketCap) : undefined;

  return (
    <ScrollIndicator>
      <Flex gap={3}>
        <TokenStatsCard>
          <TokenStatsCardContent
            title="Market Cap"
            value={adjustedMarketCap}
            secondaryValue={
              tradingVolume24h !== undefined
                ? `/ Trading volume: ${formatUsdValue(tradingVolume24h)}`
                : undefined
            }
          />
        </TokenStatsCard>
        <TokenStatsCard>
          <TokenStatsCardContent
            title="Price"
            value={
              <Flex gap={1} alignItems="center">
                <Text textStyle="heading-sm" color="textPrimary">
                  {adjustedPrice}
                </Text>
                <Icon
                  color={
                    priceChangePercentage24h !== undefined && priceChangePercentage24h > 0
                      ? 'var(--stacks-colors-green-500)'
                      : 'var(--stacks-colors-red-500)'
                  }
                >
                  {priceChangePercentage24h !== undefined && priceChangePercentage24h > 0 ? (
                    <TrendUp />
                  ) : (
                    <TrendDown />
                  )}
                </Icon>
              </Flex>
            }
          />
        </TokenStatsCard>
        <TokenStatsCard>
          <TokenStatsCardContent
            title="Circulating supply"
            value={adjustedCirculatingSupply}
            secondaryValue={
              adjustedTotalSupply !== undefined
                ? `/ Total supply: ${adjustedTotalSupply}`
                : undefined
            }
          />
        </TokenStatsCard>
        <TokenStatsCard>
          <TokenStatsCardContent title="Holders" value={adjustedHolders} />
        </TokenStatsCard>
        <TokenStatsCard
          bg={{
            base: 'linear-gradient(138.36deg, var(--stacks-colors-surface-primary) 73.53%, #DD3B00 161.25%);',
            _dark: 'linear-gradient(138.36deg, #211F1F 73.53%, #DD3B00 161.25%);',
          }}
          justifyContent="center"
          hideBelow="lg"
        >
          <Button variant="redesignStacks" boxShadow="0px 8px 16px 0px #FC643266">
            <Flex alignItems="center" gap={1}>
              <Text textStyle="text-medium-sm">Get sBTC</Text>
              <Icon color="iconPrimary" h={3.5} w={3.5}>
                <ArrowUpRight />
              </Icon>
            </Flex>
          </Button>
        </TokenStatsCard>
      </Flex>
    </ScrollIndicator>
  );
}

function TokenStatsCard({ children, ...props }: { children: ReactNode } & FlexProps) {
  return (
    <Flex
      minW="180px"
      flexGrow={1}
      alignItems="center"
      px={4}
      py={3}
      borderRadius="redesign.md"
      bg="surfacePrimary"
      {...props}
    >
      {children}
    </Flex>
  );
}

function TokenStatsCardContent({
  title,
  value,
  secondaryValue,
}: {
  title: string;
  value: ReactNode;
  secondaryValue?: ReactNode;
}) {
  return (
    <Stack gap={1} justifyContent="flex-start" h="full" w="full">
      <Text textStyle="text-medium-sm" color="textSecondary" whiteSpace="nowrap">
        {title}
      </Text>
      {typeof value === 'string' ? (
        <Text textStyle="heading-sm" color="textPrimary">
          {value}
        </Text>
      ) : (
        value
      )}
      {secondaryValue && (
        <Text textStyle="text-medium-xs" color="textSecondary">
          {secondaryValue}
        </Text>
      )}
    </Stack>
  );
}
