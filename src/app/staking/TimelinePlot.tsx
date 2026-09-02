'use client';

import { ChartTooltipSurface } from '@/app/_components/NetworkOverview/ChartTooltip';
import { Text } from '@/ui/Text';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { BondTooltip, BondTooltipData } from './BondTooltip';
import { DISTRIBUTIONS_PER_BOND } from './consts';
import {
  BondTimelineState,
  DistributionGridCell,
  approximateBurnHeightAt,
  burnHeightToRewardCycle,
} from './projections';
import { formatDateWithYear } from './utils';

/** Row geometry, in spacing units, shared by the rows and the overlay drawn over them. */
export const ROW_LABEL_WIDTH = 20;
const ROW_HEIGHT = 7;
const ROW_GAP = 2.5;
const PLOT_TOP = 9;

/** How quickly the card and its guide line follow the pointer. */
const FOLLOW_MS = 150;
/**
 * How long a bar stays hovered after the pointer leaves it: long enough to
 * cross the gap into the card, whose links need the pointer to reach them.
 */
const BAR_GRACE_MS = 200;
/** Space between the pointer and the card, so the card never sits under it. */
const POINTER_OFFSET = 14;
/** The card's resting distance from the top of the plot. */
const REST_TOP = 4;

/**
 * A bond's term drawn as its 24 reward distributions.
 *
 * Fab's prototype colours bars by whether the bond is yours, which needs a
 * connected wallet. Here each bar is divided into the distributions it will
 * receive, so the fill shows how much of the term has actually paid out rather
 * than just how much time has passed.
 */
export const SEGMENT_PAID_BG = 'accent.stacks-500';
export const SEGMENT_REMAINING_BG = 'accent.stacks-300';

function Bar({
  state,
  distributionsPaid,
}: {
  state: BondTimelineState;
  distributionsPaid: number;
}) {
  // A bond that has not started has no distributions to divide, and its term is
  // an outline rather than a fill.
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

/** A row as the plot draws it: the bar geometry plus what the card says about it. */
export type PlotRow = TimelineRow & { tooltip: BondTooltipData };

/** Where the pointer is over the plot, in plot pixels, plus the plot's size. */
interface PlotPointer {
  x: number;
  y: number;
  plotWidth: number;
  plotHeight: number;
}

/**
 * The one card that is always on the plot.
 *
 * At rest it names today on the today line. With a pointer over the plot it
 * follows it, naming the moment underneath; over a bar it grows into that
 * bond's details. Size is measured from the content and animated, so the card
 * morphs between the two rather than snapping.
 */
function HoverCard({
  pointer,
  restPercent,
  plotWidth,
  rich,
  children,
}: {
  pointer?: PlotPointer;
  /** Where the card rests, as a share of the plot width. */
  restPercent: number;
  /** The plot's width in pixels once measured, so rest and hover share one coordinate space. */
  plotWidth?: number;
  /** Whether the content is the bond details rather than a one-line label. */
  rich: boolean;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  // Centred on the pointer, kept inside the plot, and flipped above the
  // pointer when there is no room below. At rest it sits on the today line.
  // Pixel transforms rather than left/top, so following the pointer moves the
  // card on the compositor instead of relaying out the plot.
  let x: number | undefined;
  let y = REST_TOP;
  if (pointer) {
    x = Math.min(Math.max(pointer.x - width / 2, 0), Math.max(pointer.plotWidth - width, 0));
    const below = pointer.y + POINTER_OFFSET;
    y =
      below + height <= pointer.plotHeight
        ? below
        : Math.max(pointer.y - POINTER_OFFSET - height, 0);
  } else if (plotWidth !== undefined) {
    x = (restPercent / 100) * plotWidth - width / 2;
  }

  return (
    <ChartTooltipSurface
      position="absolute"
      top={0}
      // Until the plot is measured, the card sits on today by percentage.
      left={x === undefined ? `calc(${restPercent}% - ${width / 2}px)` : 0}
      w={size ? undefined : 'max-content'}
      overflow="hidden"
      zIndex={2}
      // Interactive only while it shows a bond, whose details carry links.
      pointerEvents={rich ? 'auto' : 'none'}
      data-hover-card="true"
      willChange="transform"
      transition={`transform ${FOLLOW_MS}ms ease-out, width ${FOLLOW_MS}ms ease-out, height ${FOLLOW_MS}ms ease-out`}
      _motionReduce={{ transition: 'none' }}
      // Inline, so a value that changes every frame does not mint a new class.
      style={{
        transform: x === undefined ? undefined : `translate3d(${x}px, ${y}px, 0)`,
        width: size ? `${size.width}px` : undefined,
        height: size ? `${size.height}px` : undefined,
      }}
    >
      <Box ref={contentRef} w="max-content" px={rich ? 3 : 2} py={rich ? 2.5 : 1}>
        {children}
      </Box>
    </ChartTooltipSurface>
  );
}

/**
 * The bars and the grid beneath them.
 *
 * Memoised, because pointer moves update state many times a second and the
 * several hundred cells here must not be rebuilt each time. Nothing about
 * hovering reaches this block as a prop; the bar's own dim is plain CSS.
 */
const TimelineRows = memo(function TimelineRows({
  rows,
  cells,
}: {
  rows: TimelineRow[];
  cells: DistributionGridCell[];
}) {
  return (
    // Above the overlay's column highlight, so bars cover it and the
    // translucent cells tint it.
    <Stack gap={ROW_GAP} position="relative" zIndex={1}>
      {rows.map(row => (
        <Flex key={row.index} align="center">
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
              position="absolute"
              left={`${row.leftPercent}%`}
              width={`${row.widthPercent}%`}
              minW={1}
              _hover={{ opacity: 0.7 }}
              transition="opacity 150ms ease-out"
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

/**
 * The bars, the grid, and the hover layer over them.
 *
 * Owns the pointer state, so the many updates a second it produces re-render
 * only this subtree, and within it only the small hover layer, never the
 * section heading, tabs and legend around it.
 */
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
  // Pointer position is measured against the plot area rather than the row,
  // since the labels take a fixed strip on the left.
  const plotRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PlotPointer>();
  const [hoveredBondIndex, setHoveredBondIndex] = useState<number>();
  const barGrace = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Mirrors hoveredBondIndex for the frame callback, which never re-binds.
  const hoveredRef = useRef<number>(undefined);
  const frame = useRef<number>(undefined);
  const latestMove = useRef<{ x: number; y: number; target: EventTarget | null }>(null);
  const trackCursor = useCallback((event: React.MouseEvent) => {
    latestMove.current = { x: event.clientX, y: event.clientY, target: event.target };
    // One state update per frame, however many move events the browser sends.
    if (frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const move = latestMove.current;
      const rect = plotRef.current?.getBoundingClientRect();
      if (!move || !rect || rect.width <= 0) return;
      const target = move.target as HTMLElement | null;
      // Reading the card: hold everything where it is so its links can be used.
      if (target?.closest?.('[data-hover-card]')) {
        clearTimeout(barGrace.current);
        return;
      }
      const x = move.x - rect.left;
      if (x < 0 || x > rect.width) {
        setPointer(undefined);
        return;
      }
      const bar = target?.closest?.('[data-bond-index]') as HTMLElement | null;
      clearTimeout(barGrace.current);
      if (bar?.dataset.bondIndex !== undefined) {
        // Over a bar the card anchors where the pointer entered, like a
        // tooltip, so it can be reached rather than chased.
        const index = Number(bar.dataset.bondIndex);
        if (hoveredRef.current !== index) {
          hoveredRef.current = index;
          setHoveredBondIndex(index);
          setPointer({ x, y: move.y - rect.top, plotWidth: rect.width, plotHeight: rect.height });
        }
        return;
      }
      setPointer({ x, y: move.y - rect.top, plotWidth: rect.width, plotHeight: rect.height });
      // Leaving a bar waits a beat before the card shrinks back, so a pointer
      // crossing to the next bar, or into the card, does not flicker through
      // the small state on the way.
      if (hoveredRef.current !== undefined) {
        barGrace.current = setTimeout(() => {
          hoveredRef.current = undefined;
          setHoveredBondIndex(undefined);
        }, BAR_GRACE_MS);
      }
    });
  }, []);
  const clearCursor = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    clearTimeout(barGrace.current);
    hoveredRef.current = undefined;
    setPointer(undefined);
    setHoveredBondIndex(undefined);
  }, []);
  useEffect(
    () => () => {
      clearTimeout(barGrace.current);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    []
  );

  // The plot's width, so the card and the line can be placed in pixels at rest
  // as well as under the pointer.
  const [plotWidth, setPlotWidth] = useState<number>();
  useEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => setPlotWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const todayLabel = new Date(nowMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  // What the pointer is over, named in the chain's own terms.
  const pointerPercent = pointer ? (pointer.x / pointer.plotWidth) * 100 : undefined;
  const pointerLabel = (() => {
    if (pointerPercent === undefined) return undefined;
    const span = bounds.endMs - bounds.startMs;
    if (span <= 0) return undefined;
    const atMs = bounds.startMs + (pointerPercent / 100) * span;
    const height = approximateBurnHeightAt(atMs, currentBurnHeight, nowMs);
    const cycle = burnHeightToRewardCycle(height, firstBurnchainBlockHeight, rewardCycleLength);
    // Heights the chain has passed are known; the rest are projected.
    const prefix = height > currentBurnHeight ? '~' : '';
    return [
      cycle !== undefined ? `cycle ${cycle}` : undefined,
      `#${height.toLocaleString()}`,
      `${prefix}${formatDateWithYear(atMs)}`,
    ]
      .filter(Boolean)
      .join(' · ');
  })();
  const hoveredRow = rows.find(row => row.index === hoveredBondIndex);
  const hoveredCell =
    pointerPercent === undefined
      ? undefined
      : cells.find(
          cell =>
            pointerPercent >= cell.leftPercent &&
            pointerPercent < cell.leftPercent + cell.widthPercent
        );

  return (
    <Box position="relative" pt={PLOT_TOP} onMouseMove={trackCursor} onMouseLeave={clearCursor}>
      <TimelineRows rows={rows} cells={cells} />
      <Flex position="absolute" inset={0} pointerEvents="none">
        <Box w={ROW_LABEL_WIDTH} flexShrink={0} pr={3} />
        <Box position="relative" flex={1} ref={plotRef}>
          {/*
            The distribution under the pointer, lit in every row. Drawn behind
            the rows, so bars cover it and the translucent cells take its tint,
            without re-rendering a single cell.
          */}
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
          {/* One line: today at rest, the pointer while one is over the plot. */}
          <Box
            position="absolute"
            top={0}
            bottom={0}
            // Until the plot is measured, it marks today by percentage.
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
            pointer={pointer}
            restPercent={todayPercent}
            plotWidth={plotWidth}
            rich={!!hoveredRow}
          >
            {hoveredRow ? (
              <BondTooltip
                bond={hoveredRow.tooltip}
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
                {pointerLabel ?? `today · ${todayLabel}`}
              </Text>
            )}
          </HoverCard>
        </Box>
      </Flex>
    </Box>
  );
}
