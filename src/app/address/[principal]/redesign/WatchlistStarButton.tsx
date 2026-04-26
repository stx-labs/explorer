'use client';

import { truncateStxAddress } from '@/common/utils/utils';
import { RemoveFromWatchlistDialog } from '@/features/watchlist/RemoveFromWatchlistDialog';
import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon } from '@chakra-ui/react';
import { Star } from '@phosphor-icons/react';
import { useState } from 'react';

import { useAddressIdPageData } from '../AddressIdPageContext';

export function WatchlistStarButton({ principal }: { principal: string }) {
  const { initialAddressBNSNamesData } = useAddressIdPageData();
  const bnsName = initialAddressBNSNamesData?.names?.[0];
  const { isInWatchlist, add, remove, hydrated } = useWatchlist();
  const saved = isInWatchlist(principal);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const label = saved ? 'Remove from watchlist' : 'Add to watchlist';
  const addressLabel = bnsName || truncateStxAddress(principal);

  return (
    <>
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
          onClick={() => {
            if (!saved) {
              add(principal, bnsName ? { bnsName } : undefined);
            } else {
              setRemoveDialogOpen(true);
            }
          }}
        >
          <Flex alignItems="center" gap={1}>
            <Icon h={3.5} w={3.5} color={saved ? 'accent.stacks-500' : 'iconPrimary'}>
              <Star weight={saved ? 'fill' : 'bold'} />
            </Icon>
            <Text
              textStyle="text-medium-xs"
              color="textSecondary"
              display={{ base: 'none', sm: 'block' }}
            >
              Watchlist
            </Text>
          </Flex>
        </Button>
      </Tooltip>
      <RemoveFromWatchlistDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        addressLabel={addressLabel}
        onConfirm={() => remove(principal)}
      />
    </>
  );
}
