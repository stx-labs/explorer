'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { useWatchlistNewTxCount } from '@/features/watchlist/useWatchlistNewTxCount';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon } from '@chakra-ui/react';
import { Star } from '@phosphor-icons/react';

export function WatchlistNavLink() {
  const { activeNetwork: network } = useGlobalContext();
  const newTxCount = useWatchlistNewTxCount();

  return (
    <NextLink href={buildUrl('/watchlist', network)} variant="noUnderline">
      <Flex
        alignItems="center"
        gap={2}
        px={2}
        py={2}
        borderRadius="redesign.md"
        _hover={{ bg: 'surfacePrimary' }}
        position="relative"
      >
        <Icon h={4} w={4} color="iconPrimary">
          <Star weight="bold" />
        </Icon>
        <Text fontSize="sm" display={{ base: 'none', md: 'block' }}>
          Watchlist
        </Text>
        {newTxCount > 0 ? (
          <Box
            borderRadius="full"
            minW={6}
            px={1.5}
            py={0.5}
            textAlign="center"
            bg="accent.stacks-500"
            color="white"
            fontSize="xs"
            fontWeight="bold"
          >
            {newTxCount > 99 ? '99+' : newTxCount}
          </Box>
        ) : null}
      </Flex>
    </NextLink>
  );
}
