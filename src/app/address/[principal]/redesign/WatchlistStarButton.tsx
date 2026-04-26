'use client';

import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { Tooltip } from '@/ui/Tooltip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Icon } from '@chakra-ui/react';
import { Star } from '@phosphor-icons/react';

import { useAddressIdPageData } from '../AddressIdPageContext';

export function WatchlistStarButton({ principal }: { principal: string }) {
  const { initialAddressBNSNamesData } = useAddressIdPageData();
  const bnsName = initialAddressBNSNamesData?.names?.[0];
  const { isInWatchlist, toggle, hydrated } = useWatchlist();
  const saved = isInWatchlist(principal);

  const label = saved ? 'Remove from watchlist' : 'Add to watchlist';

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="unstyled"
        borderRadius="redesign.md"
        bg="surfacePrimary"
        h="fit-content"
        w="fit-content"
        p={2.5}
        aria-label={label}
        aria-pressed={saved}
        disabled={!hydrated}
        _hover={{
          bg: 'surfaceFifth',
        }}
        onClick={() => toggle(principal, bnsName ? { bnsName } : undefined)}
      >
        <Flex alignItems="center" gap={1}>
          <Icon h={3.5} w={3.5} color={saved ? 'accent.stacks-500' : 'iconPrimary'}>
            <Star weight={saved ? 'fill' : 'bold'} />
          </Icon>
          <Text textStyle="text-medium-xs" color="textSecondary" display={{ base: 'none', sm: 'block' }}>
            Watchlist
          </Text>
        </Flex>
      </Button>
    </Tooltip>
  );
}
