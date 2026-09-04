'use client';

import { ExplorerLink } from '@/common/components/ExplorerLinks';
import type { DetailRef, RichPart } from '@/common/tx-diagnosis';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon, chakra, useClipboard } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { Fragment } from 'react';

/**
 * Copyable identifier chip — the TxHeader badge pattern at inline size.
 * The label is a real button that copies the full value; the ↗ is a sibling link to the
 * identifier's page, so no interactive element is nested inside another. Long labels (tuples,
 * trait principals) are clipped with an ellipsis; the copied value is always complete.
 */
export function DetailChip({ detail, emphasis }: { detail: DetailRef; emphasis?: 'error' }) {
  const { copied, copy } = useClipboard({ value: detail.value, timeout: 900 });
  return (
    <Tooltip content="Copied" open={copied} variant="redesignPrimary">
      <Flex
        as="span"
        display="inline-flex"
        alignItems="center"
        gap={0.5}
        mx={0.5}
        maxW="100%"
        minW={0}
        bg="surfacePrimary"
        _hover={{ bg: 'surfaceFifth' }}
        borderRadius="redesign.sm"
        verticalAlign="middle"
        data-test="why-failed-detail"
      >
        <chakra.button
          type="button"
          onClick={() => copy()}
          aria-label={`Copy ${detail.value}`}
          title={detail.value}
          bg="transparent"
          border="none"
          px={1.5}
          py={0.5}
          minW={0}
          maxW="100%"
          cursor="pointer"
          borderRadius="redesign.sm"
          _focusVisible={{ outline: '2px solid', outlineColor: 'redesignBorderPrimary' }}
        >
          <Text
            as="span"
            display="block"
            textStyle="text-mono-xs"
            color={emphasis === 'error' ? 'error' : 'textPrimary'}
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxW="100%"
          >
            {detail.label}
          </Text>
        </chakra.button>
        {detail.href && (
          <ExplorerLink
            href={detail.href}
            display="inline-flex"
            flexShrink={0}
            pr={1.5}
            aria-label={`Open ${detail.label}`}
            _hover={{ textDecoration: 'none' }}
          >
            <Icon h={3} w={3} color="iconTertiary" _hover={{ color: 'iconPrimary' }}>
              <ArrowSquareOut />
            </Icon>
          </ExplorerLink>
        )}
      </Flex>
    </Tooltip>
  );
}

export function RichText({
  parts,
  textStyle = 'text-regular-sm',
  color = 'textPrimary',
}: {
  parts: RichPart[];
  textStyle?: string;
  color?: string;
}) {
  return (
    <Text as="p" textStyle={textStyle} color={color} lineHeight="1.9">
      {parts.map((p, i) =>
        typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <DetailChip key={i} detail={p} />
      )}
    </Text>
  );
}
