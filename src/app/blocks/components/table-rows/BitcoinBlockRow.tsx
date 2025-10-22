'use client';

import { TimeStampCellRenderer } from '@/common/components/table/table-examples/TxTableCellRenderers';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { truncateMiddle } from '@/common/utils/utils';
import { BlockHeightBadge, DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import BitcoinCircleIcon from '@/ui/icons/BitcoinCircleIcon';
import StacksIconBlock from '@/ui/icons/StacksIconBlock';
import StxIcon from '@/ui/icons/StxIcon';
import { Box, Flex, Link, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

export const BitcoinBlockRow = {
  HeightCell: (height: number, burnBlockHash: string) => (
    <DefaultBadge
      variant="solid"
      type="blockHeight"
      icon={<DefaultBadgeIcon icon={<BitcoinCircleIcon />} color="accent.bitcoin-500" size={4} />}
      label={
        <Link
          as={NextLink}
          href={`/btcblock/${burnBlockHash}`}
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
      _groupHover={{ bg: 'surfaceTertiary' }}
    />
  ),

  HashCell: (hash: string, burnBlockHash: string) => (
    <Link
      as={NextLink}
      href={`/btcblock/${burnBlockHash}`}
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

  StacksBlocksIntervalCell: (stacksBlocks: string[] | undefined) => (
    <Flex align="center" gap={2}>
      {stacksBlocks && stacksBlocks.length > 0 ? (
        <>
          {stacksBlocks.slice(0, 2).map((blockHash, index) => (
            <Link
              as={NextLink}
              href={`/block/${blockHash}`}
              key={`${blockHash}-${index}`}
              _hover={{ textDecoration: 'none' }}
            >
              <DefaultBadge
                icon={
                  <DefaultBadgeIcon
                    icon={<StacksIconBlock color="iconTertiary" />}
                    color="iconTertiary"
                  />
                }
                label={
                  <DefaultBadgeLabel
                    label={`#${truncateMiddle(blockHash, 5, 5)}`}
                    color="textPrimary"
                    textDecoration="underline"
                    textStyle="text-mono-sm"
                    _hover={{ color: 'textInteractiveHover' }}
                  />
                }
                bg="surfacePrimary"
                border="none"
                _groupHover={{ bg: 'surfaceTertiary' }}
              />
            </Link>
          ))}
          {stacksBlocks.length > 2 && (
            <Text textStyle="text-regular-xs" lineHeight="16px" color="textTertiary">
              +{stacksBlocks.length - 2}
            </Text>
          )}
        </>
      ) : (
        <Text textStyle="text-regular-sm" lineHeight="20px" color="textTertiary">
          —
        </Text>
      )}
    </Flex>
  ),

  StacksBlocksCell: (count: number) => (
    <Text textStyle="text-regular-sm" lineHeight="20px" color="textPrimary">
      {(count ?? 0).toLocaleString()}
    </Text>
  ),

  StacksTxsCell: (count: number) => (
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
};
