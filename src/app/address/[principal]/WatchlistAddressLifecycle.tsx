'use client';

import { useAppSelector } from '@/common/state/hooks';
import { store } from '@/common/state/store';
import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { useEffect, useRef } from 'react';

import { useAddressIdPageData } from './AddressIdPageContext';

/** Marks the address as viewed for notification baselines and syncs BNS into the watchlist entry. */
export function WatchlistAddressLifecycle({ principal }: { principal: string }) {
  const { initialAddressBNSNamesData } = useAddressIdPageData();
  const bnsName = initialAddressBNSNamesData?.names?.[0];
  const { markAddressViewed, setBnsName } = useWatchlist();

  const inWatchlist = useAppSelector(s => s.watchlist.items.some(i => i.principal === principal));

  const markAddressViewedRef = useRef(markAddressViewed);
  markAddressViewedRef.current = markAddressViewed;

  const setBnsNameRef = useRef(setBnsName);
  setBnsNameRef.current = setBnsName;

  useEffect(() => {
    if (!inWatchlist) return;
    markAddressViewedRef.current(principal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref holds latest; run when membership/route changes
  }, [principal, inWatchlist]);

  useEffect(() => {
    if (!inWatchlist || !bnsName) return;

    const stored = store.getState().watchlist.items.find(i => i.principal === principal)?.bnsName;
    if (stored === bnsName) {
      return;
    }

    setBnsNameRef.current(principal, bnsName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setBnsName via ref; avoid callback identity loops
  }, [principal, bnsName, inWatchlist]);

  return null;
}
