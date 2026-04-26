'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import {
  WATCHLIST_TX_INITIAL_LIMIT,
  useWatchlistTransactionQueries,
} from '@/common/queries/useWatchlistQueries';
import { buildUrl } from '@/common/utils/buildUrl';
import { microToStacksFormatted, truncateStxAddress } from '@/common/utils/utils';
import { Box, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';

import {
  getTxUnixSeconds,
  transactionToUnified,
  unwrapAddressTransactionRow,
} from './unifiedTxMap';
import { useWatchlist } from './useWatchlist';

/** Toasts when the newest transaction for a watched address changes and is newer than the last-viewed baseline. */
export function WatchlistTxNotifier() {
  const router = useRouter();
  const { activeNetwork: network } = useGlobalContext();
  const { sortedItems, notificationsDisabled, hydrated } = useWatchlist();
  const principals = useMemo(() => sortedItems.map(i => i.principal), [sortedItems]);
  const itemsByPrincipal = useMemo(
    () => Object.fromEntries(sortedItems.map(i => [i.principal, i])),
    [sortedItems]
  );

  const queries = useWatchlistTransactionQueries(
    principals,
    WATCHLIST_TX_INITIAL_LIMIT,
    0,
    hydrated && principals.length > 0 && !notificationsDisabled
  );

  const latestSnapshot = principals
    .map((p, i) => {
      const row = queries[i]?.data?.results?.[0];
      const { tx } = row ? unwrapAddressTransactionRow(row) : { tx: undefined };
      return tx ? `${p}:${tx.tx_id}` : `${p}:`;
    })
    .join('|');

  const prevSnapshotRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!hydrated || notificationsDisabled || principals.length === 0) return;

    if (!seededRef.current) {
      prevSnapshotRef.current = latestSnapshot;
      seededRef.current = true;
      return;
    }

    if (prevSnapshotRef.current === latestSnapshot) return;

    principals.forEach((p, i) => {
      const row = queries[i]?.data?.results?.[0];
      if (!row) return;
      const { tx, v2Totals } = unwrapAddressTransactionRow(row);
      const prevEntry = prevSnapshotRef.current?.split('|').find(s => s.startsWith(`${p}:`));
      const prevId = prevEntry?.split(':')[1] ?? '';
      if (!prevId || prevId === tx.tx_id) return;

      const item = itemsByPrincipal[p];
      if (!item) return;
      const baseline = item.lastViewedAt ?? item.addedAt;
      const ts = getTxUnixSeconds(tx);
      if (ts === null || ts * 1000 <= baseline) return;

      const label = item.bnsName || truncateStxAddress(p);
      const unified = transactionToUnified(tx, p, v2Totals);
      const href = buildUrl(`/txid/${tx.tx_id}`, network);

      toast.custom(
        tw => (
          <Box
            role="button"
            tabIndex={0}
            bg="surfaceSecondary"
            borderRadius="redesign.md"
            p={4}
            boxShadow="elevation2"
            cursor="pointer"
            borderWidth="1px"
            borderColor="redesignBorderSecondary"
            onClick={() => {
              router.push(href);
              toast.dismiss(tw.id);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(href);
                toast.dismiss(tw.id);
              }
            }}
          >
            <Text textStyle="text-medium-sm" color="textPrimary">
              New transaction on {label}
            </Text>
            <Text textStyle="text-regular-xs" color="textSecondary" mt={1}>
              {unified.type} · {unified.direction === 'in' ? 'Incoming' : 'Outgoing'}
              {unified.amount !== '0' ? ` · ${microToStacksFormatted(unified.amount)} STX` : ''}
            </Text>
          </Box>
        ),
        { duration: 8000 }
      );
    });

    prevSnapshotRef.current = latestSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- latestSnapshot already reflects query data
  }, [
    hydrated,
    itemsByPrincipal,
    latestSnapshot,
    network,
    notificationsDisabled,
    principals,
    router,
  ]);

  return null;
}
