'use client';

import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';

/**
 * The "view all" affordance at the foot of a truncated list.
 *
 * Uses an icon rather than an arrow character, which inherits the text font and
 * renders longer and heavier than the design intends.
 */
export function ViewAllLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  /** Leaves the Explorer, so it opens in a new tab and points out of the app. */
  external?: boolean;
}) {
  const content = (
    <Flex
      align="center"
      gap={1.5}
      color="textPrimary"
      borderBottom="1px solid"
      borderColor="redesignBorderPrimary"
      width="fit-content"
      cursor="pointer"
    >
      <Text textStyle="text-medium-sm" color="currentColor">
        {children}
      </Text>
      <Icon w={3.5} h={3.5} color="currentColor">
        {external ? <ArrowUpRight weight="bold" /> : <ArrowRight weight="bold" />}
      </Icon>
    </Flex>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <NextLink href={href} variant="noUnderline">
      {content}
    </NextLink>
  );
}
