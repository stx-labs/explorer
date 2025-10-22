'use client';

import { TimeStampCellRenderer } from '@/common/components/table/table-examples/TxTableCellRenderers';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { truncateMiddle } from '@/common/utils/utils';
import { BlockHeightBadge, DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import BitcoinCircleIcon from '@/ui/icons/BitcoinCircleIcon';
import StacksIconBlock from '@/ui/icons/StacksIconBlock';
import StxIcon from '@/ui/icons/StxIcon';
import { Box, Flex, Link, Text, Tooltip } from '@chakra-ui/react';
import NextLink from 'next/link';

export const StacksBlockRow = {
  HeightCell: (height: number) => (
    <DefaultBadge
      variant="solid"
      type="blockHeight"
      icon={<DefaultBadgeIcon icon={<StacksIconBlock />} color="accent.stacks-500" />}
      label={
        <Link
          as={NextLink}
          href={`/block/${height}`}
          textStyle="text-mono-sm"
          color="textPrimary"
          textDecorationColor="textPrimary"
          _hover={{
            color: 'textInteractiveHover',
            textDecorationColor: 'textInteractiveHover',
          }}
          _groupHover={{
            textDecorationColor: 'textPrimary',
            _hover: { textDecorationColor: 'textInteractiveHover' },
          }}
        >
          #{height}
        </Link>
      }
      border="none"
      _groupHover={{ bg: 'surfaceTertiary' }}
    />
  ),

  HashCell: (hash: string) => (
    <Link
      as={NextLink}
      href={`/block/${hash}`}
      textStyle="text-regular-sm"
      color="textPrimary"
      textDecoration="underline"
      whiteSpace="nowrap"
      _hover={{
        color: 'textInteractiveHover',
      }}
    >
      {truncateMiddle(hash, 5, 5)}
    </Link>
  ),

  BitcoinBlockCell: (height: number, burnBlockHash: string) => (
    <DefaultBadge
      variant="solid"
      type="blockHeight"
      icon={<DefaultBadgeIcon icon={<BitcoinCircleIcon />} color="iconTertiary" size={4} />}
      label={
        <Link
          as={NextLink}
          href={`/btcblock/${burnBlockHash}`}
          textStyle="text-mono-sm"
          color="textPrimary"
        >
          #{height}
        </Link>
      }
      border="none"
      _groupHover={{ bg: 'surfaceTertiary' }}
    />
  ),

  TransactionsCell: (count: number) => (
    <Text textStyle="text-regular-sm" lineHeight="20px" color="textPrimary">
      {(count ?? 0).toLocaleString()}
    </Text>
  ),

  TotalFeesCell: (fees: string) => (
    <Flex align="center" gap={1.5} justifyContent="flex-end">
      <StxIcon width={10} height={12} color="iconSecondary" />
      <Text textStyle="text-regular-sm" lineHeight="20px" color="textPrimary">
        {fees}
      </Text>
    </Flex>
  ),

  TimestampCell: (timestamp: number) => (
    <Flex alignItems="center" justifyContent="flex-end" w="full">
      {TimeStampCellRenderer(
        formatTimestampToRelativeTime(timestamp),
        formatTimestamp(timestamp, 'MMM dd, yyyy HH:mm:ss', true)
      )}
    </Flex>
  ),

  BurnBlockHeaderCell: (burnBlock: {
    burn_block_height: number;
    burn_block_hash: string;
    burn_block_time: number;
    stacks_blocks_count: number;
  }) => (
    <Box
      position="relative"
      gridColumn={`1 / -1`}
      bg="surfaceSecondary"
      py={3}
      px={4}
      borderBottom="1px solid"
      borderColor="borderSecondary"
    >
      <Flex alignItems="center" gap={3}>
        <BlockHeightBadge
          blockType="btc"
          blockHeight={burnBlock.burn_block_height}
          variant="outline"
        />

        <Text textStyle="text-medium-sm" color="textSecondary">
          Bitcoin Block
        </Text>

        <Text textStyle="text-regular-xs" color="textTertiary">
          {burnBlock.stacks_blocks_count} Stacks block
          {burnBlock.stacks_blocks_count !== 1 ? 's' : ''}
        </Text>

        <Text fontSize="12px" color="textTertiary" ml="auto">
          {formatTimestamp(burnBlock.burn_block_time)}
        </Text>
      </Flex>
    </Box>
  ),
};
