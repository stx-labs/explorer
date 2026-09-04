import { ChartTooltipSurface } from '@/common/components/ChartTooltipSurface';
import { truncateMiddle } from '@/common/utils/utils';
import { useColorMode } from '@/components/ui/color-mode';
import { Text } from '@/ui/Text';
import { TooltipProps } from 'recharts';

export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const { colorMode } = useColorMode();
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const dateObj = dataPoint?.date as Date;
    let formattedDate = label;

    if (dateObj instanceof Date) {
      const timeFormat = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const dateFormat = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      formattedDate = `${timeFormat.format(dateObj)}, ${dateFormat.format(dateObj)}`;
    }

    return (
      <ChartTooltipSurface px={2} pt={1.5} pb={2.5} gap={2.5}>
        <Text
          textStyle={'text-medium-xs'}
          color={
            colorMode === 'light'
              ? 'var(--stacks-colors-neutral-sand-200)'
              : 'var(--stacks-colors-neutral-sand-300)'
          }
        >
          {formattedDate}
        </Text>
        <Text
          textStyle={'text-mono-md'}
          color={
            colorMode === 'light'
              ? 'var(--stacks-colors-neutral-sand-50)'
              : 'var(--stacks-colors-neutral-sand-100)'
          }
        >
          {`${payload[0].value?.toLocaleString('en-US')} ${payload[0].name === 'Transactions' ? 'txs' : 'blocks'}`}
        </Text>
        <Text
          textStyle={'text-medium-xs'}
          color={
            colorMode === 'light'
              ? 'var(--stacks-colors-neutral-sand-200)'
              : 'var(--stacks-colors-neutral-sand-300)'
          }
        >
          {`In Bitcoin block ${truncateMiddle(dataPoint?.burnBlockHash, 4, 4)}`}
        </Text>
      </ChartTooltipSurface>
    );
  }
  return null;
}
