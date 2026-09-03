'use client';

import { ExplorerLink } from '@/common/components/ExplorerLinks';
import type { DetailRef, RichPart } from '@/common/tx-diagnosis';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon, useClipboard } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { Fragment } from 'react';

/**
 * Copyable identifier chip — the TxHeader badge pattern at inline size.
 * Click copies the full value; the ↗ opens the identifier's page when it has one.
 */
export function DetailChip({ detail, emphasis }: { detail: DetailRef; emphasis?: 'error' }) {
  const { copied, copy } = useClipboard({ value: detail.value, timeout: 900 });
  return (
    <Tooltip content="Copied" open={copied} variant="redesignPrimary">
      <Flex
        as="span"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={1.5}
        py={0.5}
        mx={0.5}
        bg="surfacePrimary"
        _hover={{ bg: 'surfaceFifth' }}
        borderRadius="redesign.sm"
        cursor="pointer"
        verticalAlign="middle"
        onClick={() => copy()}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') copy();
        }}
        aria-label={`Copy ${detail.value}`}
        data-test="why-failed-detail"
      >
        <Text
          as="span"
          display="inline"
          textStyle="text-mono-xs"
          color={emphasis === 'error' ? 'error' : 'textPrimary'}
          whiteSpace="nowrap"
        >
          {detail.label}
        </Text>
        {detail.href && (
          <ExplorerLink
            href={detail.href}
            display="inline-flex"
            onClick={e => e.stopPropagation()}
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
