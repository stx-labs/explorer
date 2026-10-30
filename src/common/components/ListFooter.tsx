'use client';

import { Text } from '@/ui/Text';
import { Box, BoxProps, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '../../components/ui/button';
import { ExplorerLink } from './ExplorerLinks';

interface SectionFooterButtonPropsBase extends BoxProps {
  isLoading?: boolean;
  /** The last "Load more" request failed; the button becomes a retry. */
  isError?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  href?: string;
  label: string;
}

export const ListFooter: React.FC<SectionFooterButtonPropsBase> = ({
  fetchNextPage,
  isLoading,
  isError,
  href,
  label,
  hasNextPage,
  ...rest
}) => {
  if (href) {
    return (
      <Box {...rest} width="full">
        <ExplorerLink href={href} mt="auto" width="full" variant="noUnderline">
          <Button variant="secondary" width="full">
            View all recent {label}
            <Icon h={4} w={4}>
              <ArrowUpRight />
            </Icon>
          </Button>
        </ExplorerLink>
      </Box>
    );
  }
  if (fetchNextPage && hasNextPage) {
    return (
      <Box {...rest} width="full">
        <Stack gap={2} alignItems="center">
          {isError && !isLoading && (
            <Text textStyle="text-regular-sm" color="textError">
              Failed to load more {label}.
            </Text>
          )}
          <Button variant="secondary" onClick={() => fetchNextPage()} width="full">
            {isLoading ? 'Loading...' : isError ? 'Try again' : `Load more ${label}`}
          </Button>
        </Stack>
      </Box>
    );
  }
  return null;
};
