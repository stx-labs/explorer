'use client';

import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon, chakra } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';

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
        contentProps={{ maxW: '20rem', whiteSpace: 'normal', textAlign: 'left' }}
        content={note}
      >
        <chakra.button
          type="button"
          aria-label={note}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          minW={6}
          minH={6}
          flexShrink={0}
          cursor="help"
          focusVisibleRing="outside"
          focusRingColor="brand"
        >
          <Icon w={3.5} h={3.5} color="iconSecondary">
            <Info />
          </Icon>
        </chakra.button>
      </Tooltip>
    </Flex>
  );
}

export const NO_VALUE = 'N/A';
