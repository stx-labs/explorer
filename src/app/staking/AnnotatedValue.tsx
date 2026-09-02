'use client';

import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';

/**
 * A table figure that carries an explanation.
 *
 * Used where a cell would otherwise mislead: a dash that could read as zero, or
 * a number derived differently from the ones beside it. Without a note it is
 * plain text, so a cell can drop the icon when it has nothing to add.
 */
export function AnnotatedValue({ value, note }: { value: string; note?: string }) {
  if (!note) {
    return (
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {value}
      </Text>
    );
  }
  return (
    <Flex gap={1} align="center" justify="flex-end">
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {value}
      </Text>
      <Tooltip
        variant="redesignPrimary"
        size="lg"
        portalled
        contentProps={{ maxW: '20rem', whiteSpace: 'normal' }}
        content={note}
      >
        <Icon w={3.5} h={3.5} color="iconSecondary" cursor="help">
          <Info />
        </Icon>
      </Tooltip>
    </Flex>
  );
}

/** The em dash a cell shows when it has no figure to report. */
export const NO_VALUE = '—';
