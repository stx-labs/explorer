'use client';

import { useHomePageData } from '@/app/context';
import { formatTimestampTo12HourTime } from '@/common/utils/time-utils';
import { useColorMode } from '@/components/ui/color-mode';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

import { SSRDisabledMessage } from '../SSRDisabledMessage';
import { ChartTooltip } from './ChartTooltip';
import {
  Chart,
  NetworkOverviewContextProvider,
  useNetworkOverviewContext,
} from './NetworkOverviewContextProvider';
import { SectionHeader } from './SectionHeader';

export type ChartConfig = {
  dataKey: string;
  name: string;
  valueFormatter: (value: number) => string;
  subtitle: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
};

function NetworkOverviewChart() {
  const { initialRecentBlocks } = useHomePageData();

  const { stxBlocksCountPerBtcBlock } = initialRecentBlocks || {};
  const { selectedChart, setSelectedChart } = useNetworkOverviewContext();
  const { colorMode } = useColorMode();

  const chartData = useMemo(() => {
    if (!stxBlocksCountPerBtcBlock?.length) return [];

    const sortedBlocks = [...stxBlocksCountPerBtcBlock].sort(
      (a, b) => Number(a.burn_block_time) - Number(b.burn_block_time)
    );

    return sortedBlocks
      .filter(item => {
        const lastBurnBlockTime = Number(sortedBlocks[sortedBlocks.length - 1].burn_block_time);
        const sixHoursBeforeLastBlock = lastBurnBlockTime - 6 * 3600;
        const burnBlockTime = Number(item.burn_block_time);
        return burnBlockTime >= sixHoursBeforeLastBlock;
      })
      .map(item => {
        const date = new Date(Number(item.burn_block_time) * 1000);
        return {
          time: formatTimestampTo12HourTime(Number(item.burn_block_time), {
            useLocalTime: true,
            includeSeconds: false,
          }),
          date: date,
          fullDate: date.toISOString(),
          blocksMined: item.stx_blocks_count,
          dailyTransactions: item.total_tx_count,
          burnBlockHeight: item.burn_block_height,
          burnBlockHash: item.burn_block_hash,
        };
      });
  }, [stxBlocksCountPerBtcBlock]);

  const getChartConfig = (chartType: Chart): ChartConfig => {
    const commonColors = {
      color:
        colorMode === 'light'
          ? 'var(--stacks-colors-accent-stacks-400)'
          : 'var(--stacks-colors-accent-stacks-500)',
      gradientStart:
        colorMode === 'light'
          ? 'var(--stacks-colors-accent-stacks-200)'
          : 'var(--stacks-colors-accent-stacks-700)',
      gradientEnd: colorMode === 'light' ? '#F3EFEC' : '#1C1815',
    };

    const configs: Record<Chart, ChartConfig> = {
      [Chart.dailyTransactions]: {
        dataKey: 'dailyTransactions',
        ...commonColors,
        name: 'Transactions',
        valueFormatter: (value: number) => value.toLocaleString('en-US'),
        subtitle: chartData
          .reduce((sum, item) => sum + item.dailyTransactions, 0)
          .toLocaleString('en-US'),
      },
      [Chart.blocksMined]: {
        dataKey: 'blocksMined',
        ...commonColors,
        name: 'Blocks',
        valueFormatter: (value: number) => value.toLocaleString('en-US'),
        subtitle: chartData
          .reduce((sum, item) => sum + item.blocksMined, 0)
          .toLocaleString('en-US'),
      },
    };

    return configs[chartType];
  };

  const renderAreaChart = (chartType: Chart) => {
    const config = getChartConfig(chartType);
    const gradientId = 'chartGradient';

    return (
      <>
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={160}>
          <AreaChart data={chartData} key={`area-chart-${chartType}`}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.gradientStart} stopOpacity={0.8} />
                <stop offset="95%" stopColor={config.gradientEnd} stopOpacity={0.1} />
              </linearGradient>
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              horizontal={false}
              stroke={'var(--stacks-colors-redesign-border-secondary)'}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--stacks-colors-redesign-border-secondary)', strokeWidth: 1 }}
            />
            <Area
              type="linear"
              dataKey={config.dataKey}
              name={config.name}
              stroke={config.color}
              strokeWidth={1}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              animationDuration={800}
              isAnimationActive={true}
              activeDot={{
                r: 7,
                fill: '#FC6432',
                stroke: colorMode === 'light' ? '#F8D3C3' : '#602B0D',
                strokeWidth: 4,
                strokeOpacity: 0.8,
                filter: 'url(#glow)',
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
        <Box
          display="flex"
          justifyContent="space-between"
          borderTop="1px solid"
          borderColor="redesignBorderSecondary"
          pt={4}
        >
          {(() => {
            const firstTimestamp = chartData[0]?.date.getTime();
            const lastTimestamp = chartData[chartData.length - 1]?.date.getTime();
            const tickCount = 7;

            const ticks = Array.from({ length: tickCount }, (_, i) => {
              const ratio = i / (tickCount - 1);
              return new Date(firstTimestamp + ratio * (lastTimestamp - firstTimestamp));
            });

            return ticks.map((tick, index) => (
              <Text
                key={index}
                fontSize="xs"
                color="var(--stacks-colors-text-secondary)"
                display={{
                  base: index % 2 === 0 ? 'block' : 'none',
                  md: 'block',
                }}
                textAlign="center"
                suppressHydrationWarning
              >
                {tick.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ));
          })()}
        </Box>
      </>
    );
  };

  if (!initialRecentBlocks) {
    return null;
  }

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      defaultValue={selectedChart}
      onValueChange={e => setSelectedChart(e.value as Chart)}
      gap={2}
      p={4}
      background={'surfaceSecondary'}
      borderRadius="redesign.xl"
    >
      <TabsList w="100%" flexWrap={'wrap'}>
        {Object.values(Chart).map(chartType => (
          <TabsTrigger
            key={chartType}
            value={chartType}
            flex="1"
            w="100%"
            maxW="100%"
            px={4}
            py={3}
            gap={2}
            flexDir={'column'}
            _hover={{ bg: chartType === selectedChart ? 'surfacePrimary' : 'surfaceSecondary' }}
            className="group"
          >
            <Text
              fontStyle="text-medium-sm"
              color={chartType === selectedChart ? 'textSecondary' : 'textTertiary'}
              w="100%"
              textAlign="left"
              _groupHover={{ color: 'textSecondary' }}
            >
              {chartType}
            </Text>
            <Flex width="full" alignItems={'flex-end'} gap={2}>
              <Text
                textStyle={'heading-sm'}
                color={chartType === selectedChart ? 'textPrimary' : 'textTertiary'}
                textAlign="left"
                _groupHover={{
                  color: chartType === selectedChart ? 'textPrimary' : 'textSecondary',
                }}
              >
                {getChartConfig(chartType)?.subtitle}{' '}
              </Text>
              <Text
                fontStyle="text-medium-sm"
                color={chartType === selectedChart ? 'textSecondary' : 'textTertiary'}
                textAlign="left"
                _groupHover={{ color: 'textSecondary' }}
                lineHeight={'redesign.taller'}
              >
                Last 6hs
              </Text>
            </Flex>
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.values(Chart).map(chartType => (
        <TabsContent key={chartType} value={chartType} w="100%">
          {renderAreaChart(chartType)}
        </TabsContent>
      ))}
    </TabsRoot>
  );
}

export function NetworkOverview() {
  const { isSSRDisabled } = useHomePageData();
  return (
    <NetworkOverviewContextProvider>
      <Stack gap={4} flex={1}>
        <SectionHeader />
        {isSSRDisabled ? <SSRDisabledMessage /> : <NetworkOverviewChart />}
      </Stack>
    </NetworkOverviewContextProvider>
  );
}
