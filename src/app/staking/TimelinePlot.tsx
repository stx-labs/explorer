'use client';

import { ChartTooltipSurface } from '@/common/components/ChartTooltipSurface';
import { Text } from '@/ui/Text';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BondTooltip, bondSummary, hasBondActions } from './BondTooltip';
import type { BondTooltipData } from './BondTooltip';
import { DISTRIBUTIONS_PER_BOND } from './consts';
import { isInsideApproach, placeHoverCard, preferredSide } from './hoverCard';
import type { HoverCardAnchor, HoverCardView } from './hoverCard';
import type { BondTimelineState, DistributionGridCell } from './projections';
import { approximateBurnHeightAt, burnHeightToRewardCycle } from './projections';
import { formatDateWithYear } from './utils';

export const ROW_LABEL_WIDTH = 20;
const ROW_HEIGHT = 7;
const ROW_GAP = 2.5;
const PLOT_TOP = 9;

const FOLLOW_MS = 150;

const BAR_HOLD_MS = 150;

const REST_MS = 220;

const REST_TOLERANCE = 4;

const VIEW_MARGIN = 8;

export const SEGMENT_PAID_BG = 'accent.stacks-500';
export const SEGMENT_REMAINING_BG = 'accent.stacks-300';

function Bar({
  state,
  distributionsPaid,
}: {
  state: BondTimelineState;
  distributionsPaid: number;
}) {
  if (state === 'upcoming') {
    return (
      <Box
        h={ROW_HEIGHT}
        w="100%"
        borderRadius="redesign.xs"
        border="1px dashed"
        borderColor="neutral.sand-400"
      />
    );
  }
  return (
    <Flex h={ROW_HEIGHT} w="100%" gap="1px" borderRadius="redesign.xs" overflow="hidden">
      {Array.from({ length: DISTRIBUTIONS_PER_BOND }, (_, index) => (
        <Box
          key={index}
          flex="1 1 0"
          bg={index < distributionsPaid ? SEGMENT_PAID_BG : SEGMENT_REMAINING_BG}
        />
      ))}
    </Flex>
  );
}

export interface TimelineRow {
  index: number;
  label: string;
  state: BondTimelineState;
  distributionsPaid: number;
  leftPercent: number;
  widthPercent: number;
}

export type PlotRow = TimelineRow & { tooltip: BondTooltipData };

interface PlotOrigin {
  x: number;
  y: number;
}

interface PlotPointer {
  x: number;
  y: number;
  plotWidth: number;
  plotHeight: number;
  view: HoverCardView;
  origin: PlotOrigin;
}

function describePlot(rect: DOMRect) {
  return {
    plotWidth: rect.width,
    plotHeight: rect.height,
    view: {
      width: rect.width,
      top: VIEW_MARGIN - rect.top,
      bottom: window.innerHeight - rect.top - VIEW_MARGIN,
    },
    origin: { x: rect.left + window.scrollX, y: rect.top + window.scrollY },
  };
}

interface HoverState {
  pointer: PlotPointer;
  anchor: HoverCardAnchor;
  bondIndex?: number;
  held: boolean;
  expanded: boolean;
}

function HoverCard({
  anchor,
  view,
  origin,
  plotWidth,
  interactive,
  restPercent,
  restCenter,
  rich,
  cardRef,
  children,
}: {
  anchor?: HoverCardAnchor;
  view?: HoverCardView;
  origin?: PlotOrigin;
  plotWidth?: number;
  interactive: boolean;
  restPercent: number;
  restCenter: number;
  rich: boolean;
  cardRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted || !origin) return null;

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const { x, y } =
    anchor && view
      ? placeHoverCard(anchor, { width, height }, view)
      : {
          x: (restPercent / 100) * (plotWidth ?? 0) - width / 2,
          y: Math.max(restCenter - height / 2, 0),
        };

  return createPortal(
    <Box
      ref={cardRef}
      position="absolute"
      top={0}
      left={0}
      zIndex="tooltip"
      pointerEvents={interactive ? 'auto' : 'none'}
      data-hover-card="true"
      willChange="transform"
      transition={`transform ${FOLLOW_MS}ms ease-out`}
      _motionReduce={{ transition: 'none' }}
      style={{ transform: `translate3d(${origin.x + x}px, ${origin.y + y}px, 0)` }}
    >
      <ChartTooltipSurface
        bg="var(--stacks-colors-alpha-black-alpha-800)"
        w={size ? undefined : 'max-content'}
        overflow="hidden"
        transition={`width ${FOLLOW_MS}ms ease-out, height ${FOLLOW_MS}ms ease-out`}
        _motionReduce={{ transition: 'none' }}
        style={{
          width: size ? `${size.width}px` : undefined,
          height: size ? `${size.height}px` : undefined,
        }}
      >
        <Box ref={contentRef} w="max-content" px={rich ? 3 : 2} py={rich ? 2.5 : 1}>
          {children}
        </Box>
      </ChartTooltipSurface>
    </Box>,
    document.body
  );
}

const TimelineRows = memo(function TimelineRows({
  rows,
  cells,
  onBondFocus,
}: {
  rows: TimelineRow[];
  cells: DistributionGridCell[];
  onBondFocus: (index: number, element: HTMLElement) => void;
}) {
  return (
    <Stack gap={ROW_GAP} position="relative" zIndex={1}>
      {rows.map((row, rowIndex) => (
        <Flex key={row.index} data-row-index={rowIndex} align="center">
          <Box w={ROW_LABEL_WIDTH} flexShrink={0} pr={3}>
            <Text textStyle="text-regular-sm" whiteSpace="nowrap">
              {row.label}
            </Text>
          </Box>
          <Box position="relative" flex={1} h={ROW_HEIGHT}>
            {cells.map(cell => (
              <Box
                key={cell.index}
                position="absolute"
                top={0}
                bottom={0}
                left={`${cell.leftPercent}%`}
                width={`calc(${cell.widthPercent}% - 1px)`}
                borderRadius="redesign.xs"
                bg="surfaceFifth"
                opacity={0.3}
              />
            ))}
            <Box
              data-bond-index={row.index}
              role="img"
              tabIndex={0}
              aria-label={`${row.label}, ${row.state}, ${row.distributionsPaid} of ${DISTRIBUTIONS_PER_BOND} reward distributions completed`}
              onFocus={event => onBondFocus(row.index, event.currentTarget)}
              position="absolute"
              left={`${row.leftPercent}%`}
              width={`${row.widthPercent}%`}
              minW={1}
              borderRadius="redesign.xs"
              _hover={{
                transform: 'scaleY(1.15)',
                outline: '2px solid',
                outlineColor: 'textPrimary',
                zIndex: 1,
              }}
              _focusVisible={{
                transform: 'scaleY(1.15)',
                outline: '2px solid',
                outlineColor: 'textPrimary',
                zIndex: 1,
              }}
              transition="transform 150ms ease-out, outline-color 150ms ease-out"
              _motionReduce={{ transition: 'none' }}
            >
              <Bar state={row.state} distributionsPaid={row.distributionsPaid} />
            </Box>
          </Box>
        </Flex>
      ))}
    </Stack>
  );
});

export function TimelinePlot({
  rows,
  cells,
  bounds,
  todayPercent,
  currentBurnHeight,
  nowMs,
  rewardCycleLength,
  firstBurnchainBlockHeight,
}: {
  rows: PlotRow[];
  cells: DistributionGridCell[];
  bounds: { startMs: number; endMs: number };
  todayPercent: number;
  currentBurnHeight: number;
  nowMs: number;
  rewardCycleLength: number;
  firstBurnchainBlockHeight: number;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState>();
  const hoverRef = useRef<HoverState>(undefined);
  const rowBand = useRef<{ rowTop: number; rowBottom: number }>(undefined);
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rest = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number }>(undefined);
  const frame = useRef<number>(undefined);
  const latestMove = useRef<{ x: number; y: number; target: EventTarget | null }>(null);
  const actionable = useRef(new Set<number>());
  actionable.current = new Set(
    rows.filter(row => hasBondActions(row.tooltip.state)).map(row => row.index)
  );

  const commit = useCallback((next: HoverState | undefined) => {
    hoverRef.current = next;
    setHover(next);
  }, []);
  const releaseHold = useCallback(() => {
    const latest = hoverRef.current;
    if (latest?.held) commit({ ...latest, bondIndex: undefined, held: false });
  }, [commit]);
  const clearRest = useCallback(() => {
    if (rest.current) clearTimeout(rest.current.timer);
    rest.current = undefined;
  }, []);
  const expand = useCallback(() => {
    rest.current = undefined;
    const latest = hoverRef.current;
    if (latest && latest.bondIndex !== undefined && !latest.held && !latest.expanded) {
      commit({ ...latest, expanded: true });
    }
  }, [commit]);
  const armRest = useCallback(
    (x: number, y: number) => {
      if (rest.current) clearTimeout(rest.current.timer);
      rest.current = { timer: setTimeout(expand, REST_MS), x, y };
    },
    [expand]
  );

  const trackCursor = useCallback(
    (event: React.MouseEvent) => {
      latestMove.current = { x: event.clientX, y: event.clientY, target: event.target };
      if (frame.current !== undefined) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined;
        const move = latestMove.current;
        const rect = plotRef.current?.getBoundingClientRect();
        if (!move || !rect || rect.width <= 0) return;
        const target = move.target as HTMLElement | null;
        const bar = target?.closest?.('[data-bond-index]') as HTMLElement | null;
        const bondIndex =
          bar?.dataset.bondIndex === undefined ? undefined : Number(bar.dataset.bondIndex);
        const current = hoverRef.current;
        const x = move.x - rect.left;
        const y = move.y - rect.top;
        if (current?.expanded) {
          const interactive =
            current.bondIndex !== undefined && actionable.current.has(current.bondIndex);
          const onCard = interactive && target?.closest?.('[data-hover-card]');
          const cardRect = interactive ? cardRef.current?.getBoundingClientRect() : undefined;
          const approaching =
            cardRect &&
            isInsideApproach(
              current.anchor,
              {
                left: cardRect.left - rect.left,
                right: cardRect.right - rect.left,
                top: cardRect.top - rect.top,
                bottom: cardRect.bottom - rect.top,
              },
              { x, y }
            );
          if (bondIndex === current.bondIndex || onCard || approaching) return;
        }
        if (x < 0 || x > rect.width) {
          clearTimeout(hold.current);
          clearRest();
          rowBand.current = undefined;
          commit(undefined);
          return;
        }
        const row = target?.closest?.('[data-row-index]');
        if (row) {
          const rowRect = row.getBoundingClientRect();
          rowBand.current = {
            rowTop: rowRect.top - rect.top,
            rowBottom: rowRect.bottom - rect.top,
          };
        }
        const band = rowBand.current ?? { rowTop: y, rowBottom: y };
        let shown = bondIndex;
        let held = false;
        if (bondIndex === undefined && current?.bondIndex !== undefined) {
          shown = current.bondIndex;
          held = true;
          if (!current.held) hold.current = setTimeout(releaseHold, BAR_HOLD_MS);
        } else {
          clearTimeout(hold.current);
        }
        if (bondIndex === undefined) {
          clearRest();
        } else if (
          !rest.current ||
          bondIndex !== current?.bondIndex ||
          current?.held ||
          Math.hypot(x - rest.current.x, y - rest.current.y) > REST_TOLERANCE
        ) {
          armRest(x, y);
        }
        commit({
          pointer: { x, y, ...describePlot(rect) },
          anchor: { x, ...band, side: preferredSide(band, rect.height) },
          bondIndex: shown,
          held,
          expanded: false,
        });
      });
    },
    [commit, releaseHold, armRest, clearRest]
  );
  const clearCursor = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    clearTimeout(hold.current);
    clearRest();
    rowBand.current = undefined;
    commit(undefined);
  }, [commit, clearRest]);
  const focusBond = useCallback(
    (index: number, element: HTMLElement) => {
      const plotRect = plotRef.current?.getBoundingClientRect();
      if (!plotRect || plotRect.width <= 0) return;
      const barRect = element.getBoundingClientRect();
      const rowRect = element.closest('[data-row-index]')?.getBoundingClientRect() ?? barRect;
      const x = Math.min(
        Math.max(barRect.left + barRect.width / 2 - plotRect.left, 0),
        plotRect.width
      );
      const band = { rowTop: rowRect.top - plotRect.top, rowBottom: rowRect.bottom - plotRect.top };
      clearTimeout(hold.current);
      clearRest();
      commit({
        pointer: {
          x,
          y: barRect.top + barRect.height / 2 - plotRect.top,
          ...describePlot(plotRect),
        },
        anchor: { x, ...band, side: preferredSide(band, plotRect.height) },
        bondIndex: index,
        held: false,
        expanded: true,
      });
    },
    [commit, clearRest]
  );
  useEffect(
    () => () => {
      clearTimeout(hold.current);
      if (rest.current) clearTimeout(rest.current.timer);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    []
  );

  const [plotWidth, setPlotWidth] = useState<number>();
  const [plotOrigin, setPlotOrigin] = useState<PlotOrigin>();
  const [restCenter, setRestCenter] = useState((PLOT_TOP * 4) / 2);
  const measurePlot = useCallback(() => {
    const element = plotRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setPlotWidth(rect.width);
    const origin = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
    setPlotOrigin(previous =>
      previous && previous.x === origin.x && previous.y === origin.y ? previous : origin
    );
    const firstRow = element.parentElement?.parentElement?.querySelector('[data-row-index="0"]');
    if (firstRow) setRestCenter((firstRow.getBoundingClientRect().top - rect.top) / 2);
  }, []);
useEffect(() => measurePlot(), [measurePlot]);
  useEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const observer = new ResizeObserver(measurePlot);
    observer.observe(element);
    window.addEventListener('resize', measurePlot);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measurePlot);
    };
  }, [measurePlot]);

  const todayLabel = new Date(nowMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const pointer = hover?.pointer;
  const pointerPercent = pointer ? (pointer.x / pointer.plotWidth) * 100 : undefined;
  const pointerLabel = (() => {
    if (pointerPercent === undefined) return undefined;
    const span = bounds.endMs - bounds.startMs;
    if (span <= 0) return undefined;
    const atMs = bounds.startMs + (pointerPercent / 100) * span;
    const height = approximateBurnHeightAt(atMs, currentBurnHeight, nowMs);
    const cycle = burnHeightToRewardCycle(height, firstBurnchainBlockHeight, rewardCycleLength);
    const prefix = height > currentBurnHeight ? '~' : '';
    return [
      cycle !== undefined ? `cycle ${cycle}` : undefined,
      `#${height.toLocaleString()}`,
      `${prefix}${formatDateWithYear(atMs)}`,
    ]
      .filter(Boolean)
      .join(' · ');
  })();
  const hoveredRow = rows.find(row => row.index === hover?.bondIndex);
  const expanded = !!hover?.expanded && hoveredRow !== undefined;
  const interactive = expanded && hasBondActions(hoveredRow.tooltip.state);
  const hoveredCell =
    pointerPercent === undefined
      ? undefined
      : cells.find(
          cell =>
            pointerPercent >= cell.leftPercent &&
            pointerPercent < cell.leftPercent + cell.widthPercent
        );

  return (
    <Box
      position="relative"
      pt={PLOT_TOP}
      onMouseMove={trackCursor}
      onMouseLeave={clearCursor}
      onBlurCapture={event => {
        const next = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(next) && !cardRef.current?.contains(next)) clearCursor();
      }}
    >
      <TimelineRows rows={rows} cells={cells} onBondFocus={focusBond} />
      <Flex position="absolute" inset={0} pointerEvents="none">
        <Box w={ROW_LABEL_WIDTH} flexShrink={0} pr={3} />
        <Box position="relative" flex={1} ref={plotRef} data-timeline-plot="true">
          {hoveredCell &&
            rows.map((row, rowIndex) => (
              <Box
                key={row.index}
                position="absolute"
                borderRadius="redesign.xs"
                bg="surfaceFifth"
                opacity={0.5}
                zIndex={0}
                transition="left 120ms ease-out"
                _motionReduce={{ transition: 'none' }}
                style={{
                  left: `${hoveredCell.leftPercent}%`,
                  width: `calc(${hoveredCell.widthPercent}% - 1px)`,
                  top: `${(PLOT_TOP + rowIndex * (ROW_HEIGHT + ROW_GAP)) * 0.25}rem`,
                  height: `${ROW_HEIGHT * 0.25}rem`,
                }}
              />
            ))}
          <Box
            position="absolute"
            top={0}
            bottom={0}
            left={plotWidth === undefined ? `${todayPercent}%` : 0}
            borderLeft={pointer ? '1px solid' : '1px dashed'}
            borderColor={pointer ? 'neutral.sand-400' : 'redesignBorderSecondary'}
            willChange="transform"
            transition={`transform ${FOLLOW_MS}ms ease-out, border-color ${FOLLOW_MS}ms ease-out`}
            _motionReduce={{ transition: 'none' }}
            zIndex={1}
            style={
              plotWidth === undefined
                ? undefined
                : {
                    transform: `translate3d(${
                      pointer ? pointer.x : (todayPercent / 100) * plotWidth
                    }px, 0, 0)`,
                  }
            }
          />
          <HoverCard
            anchor={hover?.anchor}
            view={pointer?.view}
            origin={pointer?.origin ?? plotOrigin}
            plotWidth={plotWidth}
            interactive={interactive}
            restPercent={todayPercent}
            restCenter={restCenter}
            rich={expanded}
            cardRef={cardRef}
          >
            {expanded ? (
              <BondTooltip
                bond={hoveredRow.tooltip}
                distributionsPaid={hoveredRow.distributionsPaid}
                rewardCycleLength={rewardCycleLength}
                currentBurnHeight={currentBurnHeight}
                nowMs={nowMs}
              />
            ) : (
              <Text
                textStyle="text-mono-xs"
                color="neutral.sand-50"
                whiteSpace="nowrap"
                suppressHydrationWarning
              >
                {hoveredRow
                  ? bondSummary(hoveredRow.tooltip, currentBurnHeight, nowMs)
                  : (pointerLabel ?? `today · ${todayLabel}`)}
              </Text>
            )}
          </HoverCard>
        </Box>
      </Flex>
    </Box>
  );
}
