'use client';

import { useResizeObserver } from '@/common/hooks/useResizeObserver';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight, Plus, X } from '@phosphor-icons/react';
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFUALT_ITEM_HEIGHT_IN_PX = 40; // can make this custom
const DEFAULT_ITEM_OVERLAP_IN_PX = 8;
const DEFAULT_PX = 4;
const DEFAULT_PY = 3;
const DEFAULT_HOVER_RISE_IN_PX = 40; // How much the card rises when hovered
const EXTRA_RISE_TO_SHOW_CONTENT_IN_PX = DEFAULT_ITEM_OVERLAP_IN_PX / 2;
const MARGIN_FROM_TOP_IN_PX = 20;

function ReverseAccordionItem({
  title,
  text,
  link,
  linkLabel,
  index,
  setIsExpanded,
  isExpanded,
  accordionWidth,
  cardHeightInPx,
  top,
  px,
  py,
}: {
  title: string;
  text: string;
  link: string;
  linkLabel: string;
  index: number;
  setIsExpanded: (index: number, state: boolean) => void;
  isExpanded: boolean;
  accordionWidth: number;
  cardHeightInPx: number;
  top: number;
  px?: number;
  py?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rectTop, setRectTop] = useState<number>(0);
  const maxRise = useMemo(
    () => rectTop - cardHeightInPx - MARGIN_FROM_TOP_IN_PX,
    [rectTop, cardHeightInPx]
  );

  // Sets the content height
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
      // Sets the rect top to the top of the content if the content is higher than the rect top
      if (contentRef.current.getBoundingClientRect().top > rectTop) {
        setRectTop(contentRef.current.getBoundingClientRect().top);
      }
    }
  }, [text, isExpanded, isHovered, accordionWidth, rectTop]);

  return (
    <Stack
      ref={containerRef}
      position="absolute"
      top={`${top}px`}
      left={0}
      right={0}
      gap={0}
      bg="surfaceFourth"
      border="1px solid var(--stacks-colors-sand-50)"
      borderRadius="xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => (isExpanded ? null : setIsExpanded(index, true))}
      cursor={!isExpanded ? 'pointer' : 'default'}
      transition="all 0.3s ease-out"
      transform={
        isExpanded
          ? `translateY(-${Math.min(contentHeight, maxRise) + (index === 0 ? 0 : EXTRA_RISE_TO_SHOW_CONTENT_IN_PX)}px)`
          : isHovered
            ? `translateY(-${DEFAULT_HOVER_RISE_IN_PX}px)`
            : 'translateY(0)'
      }
      height={
        isExpanded
          ? `${cardHeightInPx + Math.min(contentHeight, maxRise)}px`
          : isHovered
            ? `${cardHeightInPx + DEFAULT_HOVER_RISE_IN_PX}px`
            : `${cardHeightInPx}px`
      }
      overflow="hidden"
      zIndex={1000 + index}
      boxShadow="0px -8px 10px -6px rgba(0, 0, 0, 0.1)"
    >
      <>
        <Flex
          height={`${cardHeightInPx}px`}
          alignItems="center"
          justifyContent="space-between"
          w="full"
          px={px}
          py={py}
        >
          <Text textStyle="text-medium-xs">{title}</Text>
          <Icon
            onClick={() => (isExpanded ? setIsExpanded(index, false) : null)}
            h={4}
            w={4}
            color="iconTertiary"
            cursor="pointer"
          >
            {isExpanded ? <X /> : <Plus />}
          </Icon>
        </Flex>
        <Stack
          ref={contentRef}
          gap={4}
          px={px}
          pb={py}
          overflowY="scroll"
          bg={
            isHovered && !isExpanded
              ? 'linear-gradient(180deg, var(--stacks-colors-surface-fourth) 10.66%, var(--stacks-colors-surface-primary) 79.69%)'
              : 'none'
          }
        >
          <Text textStyle="text-regular-xs" color="textSecondary">
            {text}
          </Text>
          <Button
            onClick={() => window.open(link, '_blank')}
            variant="redesignTertiary"
            w="fit-content"
          >
            <Flex gap={1} alignItems="center">
              <Text textStyle="text-medium-xs">{linkLabel}</Text>
              <Icon h={4} w={4} color="iconSecondary">
                <ArrowUpRight />
              </Icon>
            </Flex>
          </Button>
        </Stack>
      </>
    </Stack>
  );
}

export interface ReverseAccordionItem {
  title: string;
  text: string;
  link: string;
  linkLabel: string;
}

function calculateReverseAccordionHeight(
  numOfItems: number,
  itemHeight: number,
  itemOverlap: number
) {
  return `${numOfItems * itemHeight - itemOverlap * (numOfItems - 1)}px`;
}

export function ReverseAccordion({
  items,
  itemHeight = DEFUALT_ITEM_HEIGHT_IN_PX,
  itemOverlap = DEFAULT_ITEM_OVERLAP_IN_PX,
}: {
  items: ReverseAccordionItem[];
  itemHeight?: number;
  itemOverlap?: number;
}) {
  const [totalHeightInPx, _] = useState(
    calculateReverseAccordionHeight(items.length, itemHeight, itemOverlap)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const itemTitleRefs = useRef<React.RefObject<HTMLDivElement | null>[]>(
    Array.from({ length: items.length }, () => createRef<HTMLDivElement>())
  );

  const setIsExpanded = useCallback((index: number, state: boolean) => {
    if (state) {
      setExpandedIndex(index);
    } else {
      setExpandedIndex(null);
    }
  }, []);

  const { width } = useResizeObserver(containerRef);

  return (
    <Box
      position="relative"
      height={totalHeightInPx}
      w="full"
      ref={containerRef}
      className="REVERSE-ACCORDION"
    >
      {items.map((item, index) => (
        <ReverseAccordionItem
          key={item.title}
          title={item.title}
          text={item.text}
          link={item.link}
          linkLabel={item.linkLabel}
          index={index}
          setIsExpanded={setIsExpanded}
          isExpanded={expandedIndex === index}
          accordionWidth={width}
          cardHeightInPx={itemHeight}
          top={itemTitleRefs.current // This controls the positioning of the cards, accounting for the overlap between cards
            .slice(0, index)
            .reduce((sum, ref) => sum + (itemHeight - itemOverlap), 0)}
          px={DEFAULT_PX}
          py={DEFAULT_PY}
        />
      ))}
    </Box>
  );
}
