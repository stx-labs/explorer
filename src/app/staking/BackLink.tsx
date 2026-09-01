'use client';

import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowLeft } from '@phosphor-icons/react';

/**
 * The return path from a detail page.
 *
 * Uses an icon rather than an arrow character, which inherits the text font and
 * renders longer and heavier than the design intends.
 */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NextLink href={href} variant="noUnderline">
      <Flex
        align="center"
        gap={1.5}
        color="textPrimary"
        borderBottom="1px solid"
        borderColor="redesignBorderPrimary"
        width="fit-content"
        cursor="pointer"
      >
        <Icon w={3.5} h={3.5} color="currentColor">
          <ArrowLeft weight="bold" />
        </Icon>
        <Text textStyle="text-medium-sm" color="currentColor">
          {children}
        </Text>
      </Flex>
    </NextLink>
  );
}
