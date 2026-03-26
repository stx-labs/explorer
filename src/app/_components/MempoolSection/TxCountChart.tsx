import { getTxTypeColor, getTxTypeIcon, getTxTypeLabel } from '@/common/utils/transactions';
import { capitalize, semanticTokenToCssVar } from '@/common/utils/utils';
import { SkeletonCircle } from '@/components/ui/skeleton';
import { Text } from '@/ui/Text';
import { NEW_BORDER_RADIUS } from '@/ui/theme/borderRadius';
import {
  ClientOnly,
  Flex,
  HStack,
  Icon,
  Stack,
  StackProps,
  VisuallyHidden,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { Cell, Pie, PieChart, Tooltip, TooltipProps } from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';

const DEFAULT_PIE_CHART_WIDTH = 280;
const DEFAULT_PIE_CHART_HEIGHT = 280;
const INNER_RADIUS = 120;
const LINE_WIDTH = 7;
const OUTER_RADIUS = INNER_RADIUS + LINE_WIDTH;
const LIST_MIN_WIDTH = 239;
const TOOLTIP_OFFSET_X = 15;

type TransactionTypeData = {
  name: string;
  value: number;
  label: string;
  color: string;
  percent: number;
};

const TypeTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <Text
        textStyle={'text-medium-xs'}
        bg="var(--stacks-colors-neutral-sand-600)"
        color="var(--stacks-colors-neutral-sand-50)"
        p={2}
        borderRadius="sm"
      >
        {data.payload.label}
      </Text>
    );
  }
  return null;
};

const CenterDisplay = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => (
  <Stack
    position="absolute"
    top="50%"
    left="50%"
    transform="translate(-50%, -50%)"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    pointerEvents="none"
    gap={0}
  >
    <Text
      textStyle="heading-md"
      color={color}
      transition="color 0.2s ease-in-out"
      lineHeight={'redesign.tighter'}
    >
      {value}
    </Text>
    <Text
      textStyle="heading-xs"
      color="var(--stacks-colors-text-tertiary)"
      lineHeight={'redesign.tighter'}
    >
      {label}
    </Text>
  </Stack>
);

const LoadingSkeleton = ({
  width,
  height,
  innerRadius,
}: {
  width: number;
  height: number;
  innerRadius: number;
}) => (
  <Flex justifyContent="center" alignItems="center" width={width} height={height}>
    <SkeletonCircle width={innerRadius * 2} height={innerRadius * 2} />
  </Flex>
);

const AccessibleTable = ({
  data,
  totalCount,
}: {
  data: TransactionTypeData[];
  totalCount: number;
}) => (
  <VisuallyHidden>
    <table>
      <caption>Transaction count by type in mempool</caption>
      <thead>
        <tr>
          <th scope="col">Transaction Type</th>
          <th scope="col">Count</th>
          <th scope="col">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.name}>
            <td>{item.label}</td>
            <td>{item.value}</td>
            <td>{(item.percent * 100).toFixed(1)}%</td>
          </tr>
        ))}
        <tr>
          <th scope="row">Total</th>
          <td>{totalCount}</td>
          <td>100%</td>
        </tr>
      </tbody>
    </table>
  </VisuallyHidden>
);

const TypeListItem = ({
  item,
  isActive,
  onHover,
}: {
  item: TransactionTypeData;
  isActive: boolean;
  onHover: (item: TransactionTypeData | null) => void;
}) => (
  <HStack
    justify="space-between"
    align={'center'}
    py={4}
    cursor="pointer"
    transition="all 0.2s ease-in-out"
    opacity={isActive ? 1 : 0.4}
    borderBottom={'1px solid var(--stacks-colors-redesign-border-secondary)'}
    onMouseEnter={() => onHover(item)}
    onMouseLeave={() => onHover(null)}
  >
    <HStack gap={2} align={'center'}>
      <Icon
        bg={getTxTypeColor(item.name)}
        p={1}
        borderRadius={'sm'}
        color="var(--stacks-colors-neutral-sand-1000)"
        w={5.5}
        h={5.5}
      >
        {getTxTypeIcon(item.name)}
      </Icon>
      <Text textStyle="text-medium-sm" color="textPrimary" mb={0.5} lineHeight={'redesign.snug'}>
        {item.label}
      </Text>
    </HStack>
    <HStack gap={2}>
      <Text textStyle="text-medium-sm" color="textSecondary">
        {item.value.toLocaleString('en-US')} tx{item.value > 1 ? 's' : ''}
      </Text>
      <Text
        textStyle={'text-mono-xs'}
        color="textPrimary"
        bg="surfacePrimary"
        px={2}
        py={1}
        borderRadius={'lg'}
      >
        {item.percent * 100 < 1 ? '<1%' : `${(item.percent * 100).toFixed(0)}%`}
      </Text>
    </HStack>
  </HStack>
);

const TypesList = ({
  data,
  hoveredItem,
  onItemHover,
  className,
  ...stackProps
}: {
  data: TransactionTypeData[];
  hoveredItem: TransactionTypeData | null;
  onItemHover: (item: TransactionTypeData | null) => void;
  className?: string;
} & StackProps) => (
  <Stack
    gap={0}
    minW={`${LIST_MIN_WIDTH}px`}
    maxW={['360px', '360px', '360px', 'unset']}
    flexShrink="1"
    className={className}
    {...stackProps}
  >
    {data.map(item => (
      <TypeListItem
        key={item.name}
        item={item}
        isActive={!hoveredItem || hoveredItem.name === item.name}
        onHover={onItemHover}
      />
    ))}
  </Stack>
);

const PieChartComponent = ({
  data,
  hoveredItem,
  tooltipPosition,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  showTooltip,
  width,
  height,
  innerRadius,
  outerRadius,
}: {
  data: TransactionTypeData[];
  hoveredItem: TransactionTypeData | null;
  tooltipPosition: { x: number; y: number };
  onMouseEnter: (data: PieSectorDataItem, index: number) => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  showTooltip: boolean;
  width: number;
  height: number;
  innerRadius: number;
  outerRadius: number;
}) => (
  <Stack
    alignItems="center"
    width={width}
    height={height}
    position="relative"
    onMouseMove={onMouseMove}
  >
    <PieChart
      width={width}
      height={height}
      id="mempool-tx-count-chart"
      role="img"
      aria-label="Pie chart showing distribution of transaction types in mempool"
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <defs>
        {data.map((entry, index) => (
          <filter
            key={`glow-${index}`}
            id={`glow-${entry.name}`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.5 0"
              result="lightGlow"
            />
            <feComposite in="SourceGraphic" in2="lightGlow" operator="over" />
          </filter>
        ))}
      </defs>
      <Pie
        paddingAngle={2}
        startAngle={90}
        endAngle={450}
        data={data}
        dataKey="value"
        nameKey="name"
        cx={width / 2}
        cy={height / 2}
        labelLine={false}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        isAnimationActive={false}
        stroke="none"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={entry.color}
            stroke={entry.color}
            strokeWidth={hoveredItem && hoveredItem.name === entry.name ? 2 : 0.5}
            filter={`url(#glow-${entry.name})`}
            aria-label={`${entry.label}: ${entry.value} transactions (${(
              entry.percent * 100
            ).toFixed(1)}%)`}
            opacity={hoveredItem && hoveredItem.name !== entry.name ? 0.4 : 1}
          />
        ))}
      </Pie>
      <Tooltip
        content={<TypeTooltip />}
        cursor={false}
        position={tooltipPosition}
        active={showTooltip}
      />
    </PieChart>
  </Stack>
);

function useTransactionData(data?: { tx_type_counts: Record<string, number> }) {
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [pieData, setPieData] = useState<TransactionTypeData[]>([]);

  useEffect(() => {
    if (data?.tx_type_counts) {
      const total = Object.values(data.tx_type_counts).reduce((sum, count) => sum + count, 0);
      setTotalTxCount(total);

      const chartData: TransactionTypeData[] = Object.entries(data.tx_type_counts)
        .filter(([_, count]) => count !== 0)
        .map(([txType, count]) => {
          return {
            name: txType,
            value: count,
            label: capitalize(getTxTypeLabel(txType).toLowerCase()),
            color: getTxTypeColor(txType),
            percent: total > 0 ? count / total : 0,
          };
        });

      setPieData(chartData);
    }
  }, [data]);

  return { totalTxCount, pieData };
}

export function TxCountChart({
  mempoolStats,
  width = DEFAULT_PIE_CHART_WIDTH,
  height = DEFAULT_PIE_CHART_HEIGHT,
  innerRadius = INNER_RADIUS,
  reverseOrder = false,
}: {
  mempoolStats?: { tx_type_counts: Record<string, number> };
  width?: number;
  height?: number;
  innerRadius?: number;
  reverseOrder?: boolean;
}) {
  const outerRadius = innerRadius + LINE_WIDTH;
  const { totalTxCount, pieData } = useTransactionData(mempoolStats);
  const [hoveredItem, setHoveredItem] = useState<TransactionTypeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (_: PieSectorDataItem, index: number) => {
    setHoveredItem(pieData[index]);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setShowTooltip(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - container.left;
    const mouseY = e.clientY - container.top;

    setTooltipPosition({
      x: mouseX + TOOLTIP_OFFSET_X,
      y: mouseY,
    });
  };

  const handleListItemHover = (item: TransactionTypeData | null) => {
    setHoveredItem(item);
    setShowTooltip(false);
  };

  if (!pieData.length) {
    return <LoadingSkeleton width={width} height={height} innerRadius={innerRadius} />;
  }

  const centerDisplayValue = hoveredItem ? hoveredItem.value : totalTxCount;
  const centerNumberColor = hoveredItem
    ? 'var(--stacks-colors-text-primary)'
    : 'var(--stacks-colors-text-secondary)';

  return (
    <ClientOnly
      fallback={<LoadingSkeleton width={width} height={height} innerRadius={innerRadius} />}
    >
      <Flex width="100%" flexGrow="1">
        <Flex
          width="100%"
          justifyContent="space-between"
          alignItems="center"
          gap={6}
          ref={containerRef}
          flexWrap="wrap-reverse"
          flexGrow="1"
          flexDirection={reverseOrder ? 'row-reverse' : 'row'}
        >
          <TypesList
            data={pieData}
            hoveredItem={hoveredItem}
            onItemHover={handleListItemHover}
            minWidth={`${LIST_MIN_WIDTH}px`}
            flexShrink="1"
            flexGrow="1"
            flexBasis="fit-content"
            mb={4}
            alignSelf="center"
            mx="auto"
          />

          <Stack
            alignItems="center"
            width={width}
            height={height}
            position="relative"
            mx={['auto', 'auto', 'auto', 'unset']}
          >
            <CenterDisplay
              value={centerDisplayValue}
              label="pending txs"
              color={centerNumberColor}
            />
            <AccessibleTable data={pieData} totalCount={totalTxCount} />
            <PieChartComponent
              data={pieData}
              hoveredItem={hoveredItem}
              tooltipPosition={tooltipPosition}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              showTooltip={showTooltip}
              width={width}
              height={height}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
            />
          </Stack>
        </Flex>
      </Flex>
    </ClientOnly>
  );
}
