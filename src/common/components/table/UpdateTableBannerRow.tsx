'use client';

import { Box, Table as ChakraTable, Flex, Icon, Text } from '@chakra-ui/react';
import { ArrowsClockwise } from '@phosphor-icons/react';

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
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={message}
      cursor="pointer"
      className="group"
    >
      <ChakraTable.Cell colSpan={colSpan} py={2} px={1}>
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
      </ChakraTable.Cell>
    </ChakraTable.Row>
  );
}
