'use client';

import { Box, Table as ChakraTable, Flex, Icon, Text } from '@chakra-ui/react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import type { KeyboardEvent } from 'react';

function UpdateBannerContent({ message }: { message: string }) {
  return (
    <Flex
      alignItems="center"
      justifyContent={{ base: 'flex-start', md: 'center' }}
      gap={1.5}
      boxShadow="0px 4px 4px 0px rgba(252, 100, 50, 0.25), 0px 4px 4px 0px rgba(255, 85, 18, 0.25)"
      border="1px dashed var(--stacks-colors-accent-stacks-500)"
      borderRadius="redesign.lg"
      h={12}
      px={4}
    >
      <Box display="inline-flex">
        <Text fontSize="sm" fontWeight="medium" color="textSecondary">
          {message}
        </Text>
      </Box>
      <Icon h={3.5} w={3.5} color="iconTertiary" _groupHover={{ color: 'iconSecondary' }}>
        <ArrowsClockwise />
      </Icon>
    </Flex>
  );
}

function getBannerButtonProps(onClick: () => void, message: string) {
  return {
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    role: 'button',
    tabIndex: 0,
    'aria-label': message,
    cursor: 'pointer',
    className: 'group',
  } as const;
}

/**
 * The "new items, click to update" banner on its own, for lists that render it outside the table
 * (e.g. so it stays reachable while a filter leaves the table empty).
 */
export function UpdateTableBanner({ onClick, message }: { onClick: () => void; message: string }) {
  return (
    <Box {...getBannerButtonProps(onClick, message)}>
      <UpdateBannerContent message={message} />
    </Box>
  );
}

interface UpdateTableBannerRowProps {
  onClick: () => void;
  colSpan: number;
  message: string;
}

export function UpdateTableBannerRow({ onClick, colSpan, message }: UpdateTableBannerRowProps) {
  return (
    <ChakraTable.Row
      bg="transparent"
      css={{
        '& > td:first-of-type': {
          borderTopLeftRadius: 'redesign.md',
          borderBottomLeftRadius: 'redesign.md',
        },
        '& > td:last-of-type': {
          borderTopRightRadius: 'redesign.md',
          borderBottomRightRadius: 'redesign.md',
        },
      }}
      {...getBannerButtonProps(onClick, message)}
    >
      <ChakraTable.Cell colSpan={colSpan} py={2} px={1}>
        <UpdateBannerContent message={message} />
      </ChakraTable.Cell>
    </ChakraTable.Row>
  );
}
