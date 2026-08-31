'use client';

import { Text } from '@/ui/Text';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';

/**
 * The "view all" affordance at the foot of a truncated list.
 *
 * Uses an icon rather than an arrow character, which inherits the text font and
 * renders longer and heavier than the design intends.
 */
export function ViewAllLink({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      align="center"
      gap={1.5}
      color="textPrimary"
      borderBottom="1px solid"
      borderColor="currentColor"
      width="fit-content"
      cursor="pointer"
    >
      <Text textStyle="text-medium-sm" color="currentColor">
        {children}
      </Text>
      <Icon w={3.5} h={3.5} color="currentColor">
        <ArrowRight weight="bold" />
      </Icon>
    </Flex>
  );
}
