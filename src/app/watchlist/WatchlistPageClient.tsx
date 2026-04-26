'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useDebounce } from '@/common/hooks/useDebounce';
import {
  WATCHLIST_TX_ITEMS_PER_PAGE,
  useWatchlistBalancesBatch,
  useWatchlistTransactionQueries,
} from '@/common/queries/useWatchlistQueries';
import { useAppDispatch } from '@/common/state/hooks';
import { buildUrl } from '@/common/utils/buildUrl';
import { microToStacks, microToStacksFormatted, truncateStxAddress } from '@/common/utils/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelectField, NativeSelectRoot } from '@/components/ui/native-select';
import { WatchlistDraggableRow } from '@/features/watchlist/components/WatchlistDraggableRow';
import { WatchlistDragHandle } from '@/features/watchlist/components/WatchlistDragHandle';
import { useWatchlistHtml5RowReorder } from '@/features/watchlist/hooks/useWatchlistDragAndDrop';
import { RemoveFromWatchlistDialog } from '@/features/watchlist/RemoveFromWatchlistDialog';
import { buildPortfolioSummary, sumMicroStxStrings } from '@/features/watchlist/portfolio-utils';
import { saveNotificationsDisabled } from '@/features/watchlist/storage';
import type { UnifiedTransaction, UnifiedTxType } from '@/features/watchlist/types';
import {
  transactionToUnified,
  unwrapAddressTransactionRow,
} from '@/features/watchlist/unifiedTxMap';
import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { WATCHLIST_DND_ENABLED } from '@/features/watchlist/watchlist-dnd-flag';
import { setWatchlistNotificationsDisabled } from '@/features/watchlist/watchlist-slice';
import { arrayMove } from '@/features/watchlist/utils/reorderUtils';
import {
  WATCHLIST_STX_USD_PRICE,
  formatWatchlistUsdFromMicroStx,
} from '@/features/watchlist/watchlist-usd';
import { Button } from '@/ui/Button';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import {
  Box,
  ButtonGroup,
  Card,
  Flex,
  Grid,
  Icon,
  Input,
  Separator,
  Skeleton,
  Stack,
  Table,
  useBreakpointValue,
  useClipboard,
} from '@chakra-ui/react';
import {
  ArrowClockwise,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  House,
  Star,
  Trash,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SortKey =
  | 'stx_desc'
  | 'stx_asc'
  | 'usd_desc'
  | 'usd_asc'
  | 'added_desc'
  | 'added_asc'
  | 'label_asc';

type WatchlistTableAddressCellProps = {
  principal: string;
  bnsName?: string;
  network: ReturnType<typeof useGlobalContext>['activeNetwork'];
};

/** Desktop table cell: BNS / truncated address + copy full principal (hooks must live here, not in map). */
function WatchlistTableAddressCell({
  principal,
  bnsName,
  network,
}: WatchlistTableAddressCellProps) {
  const { copied, copy } = useClipboard({ value: principal, timeout: 750 });

  return (
    <Flex alignItems="flex-start" gap={2} minW={0}>
      <Stack gap={0} minW={0} flex="1">
        {bnsName ? (
          <NextLink
            href={buildUrl(`/address/${encodeURIComponent(principal)}`, network)}
            variant="noUnderline"
          >
            <Text textStyle="text-medium-sm" color="accent.stacks-600">
              {bnsName}
            </Text>
          </NextLink>
        ) : null}
        <Text textStyle="text-regular-xs" color="textSecondary" fontFamily="mono">
          {truncateStxAddress(principal)}
        </Text>
      </Stack>
      <Tooltip content={copied ? 'Copied!' : 'Copy address'} open={copied}>
        <Button
          type="button"
          variant="unstyled"
          aria-label="Copy address"
          flexShrink={0}
          p={1}
          borderRadius="redesign.md"
          _hover={{ bg: 'surfaceFifth' }}
          onClick={() => copy()}
        >
          <Icon h={4} w={4} color="iconSecondary">
            <Copy />
          </Icon>
        </Button>
      </Tooltip>
    </Flex>
  );
}

function txGroupLabel(ts: number): 'today' | 'yesterday' | 'earlier' {
  const t = dayjs.unix(ts);
  const now = dayjs();
  if (t.isSame(now, 'day')) return 'today';
  if (t.isSame(now.subtract(1, 'day'), 'day')) return 'yesterday';
  return 'earlier';
}

const GROUP_ORDER: Array<'today' | 'yesterday' | 'earlier'> = ['today', 'yesterday', 'earlier'];

const GROUP_LABEL: Record<'today' | 'yesterday' | 'earlier', string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const SORT_OPTIONS = [
  { value: 'stx_desc', label: 'STX balance (high)' },
  { value: 'stx_asc', label: 'STX balance (low)' },
  { value: 'usd_desc', label: 'USD value (high)' },
  { value: 'usd_asc', label: 'USD value (low)' },
  { value: 'added_desc', label: 'Date added (new)' },
  { value: 'added_asc', label: 'Date added (old)' },
  { value: 'label_asc', label: 'Name (A–Z)' },
] as const;

/** `title` / tooltip hint when balance or tx count failed to load */
const WATCHLIST_CELL_LOAD_ERROR_TITLE = 'Ошибка загрузки';

type FeedQueryLike = {
  isSuccess: boolean;
  data?: { results?: unknown[]; total?: number };
};

function watchlistAddressTxQueryHasNextPage(
  q: FeedQueryLike | undefined,
  page: number,
  pageSize: number
): boolean {
  if (!q?.isSuccess) return false;
  const results = q.data?.results?.length ?? 0;
  const total = q.data?.total ?? 0;
  const offset = (page - 1) * pageSize;
  if (results === 0 || results < pageSize) return false;
  if (total > 0) return offset + results < total;
  return true;
}

export default function WatchlistPageClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { activeNetwork: network, activeNetworkKey } = useGlobalContext();

  const {
    sortedItems,
    hydrated,
    notificationsDisabled,
    remove,
    markAllViewed,
    reorderRowsByPrincipalOrder,
  } = useWatchlist();

  const principals = useMemo(() => sortedItems.map(i => i.principal), [sortedItems]);
  const hasAddresses = principals.length > 0;

  const {
    balanceByPrincipal,
    balancesReady,
    loadedCount,
    totalCount,
    anyBalanceError,
    balanceLastUpdated,
    isBalanceFetching,
  } = useWatchlistBalancesBatch(principals, hydrated && hasAddresses);

  const [currentPage, setCurrentPage] = useState(1);
  const combinedTxSectionRef = useRef<HTMLDivElement | null>(null);
  const isFirstTxFilterEffectRef = useRef(true);

  const txFeedOffset = (currentPage - 1) * WATCHLIST_TX_ITEMS_PER_PAGE;

  const feedQueries = useWatchlistTransactionQueries(
    principals,
    WATCHLIST_TX_ITEMS_PER_PAGE,
    txFeedOffset,
    hydrated && hasAddresses
  );

  useEffect(() => {
    if (hydrated && hasAddresses) {
      markAllViewed();
    }
  }, [hydrated, hasAddresses, markAllViewed]);

  const [sortKey, setSortKey] = useState<SortKey>('added_desc');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [txFilterType, setTxFilterType] = useState<UnifiedTxType | 'all'>('all');
  const [txFilterPrincipal, setTxFilterPrincipal] = useState<string>('all');

  useEffect(() => {
    setCurrentPage(1);
    if (isFirstTxFilterEffectRef.current) {
      isFirstTxFilterEffectRef.current = false;
    } else {
      const el = combinedTxSectionRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [txFilterType, txFilterPrincipal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeNetworkKey]);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const lastUpdated = useMemo(() => {
    const feedTimes = feedQueries.map(q => q.dataUpdatedAt || 0);
    return Math.max(balanceLastUpdated, 0, ...feedTimes);
  }, [balanceLastUpdated, feedQueries]);

  const itemByPrincipal = useMemo(
    () => new Map(sortedItems.map(i => [i.principal, i] as const)),
    [sortedItems]
  );

  const { portfolio, distribution, distributionTotalStx } = useMemo(() => {
    const microBalances = principals.map(p =>
      balancesReady ? (balanceByPrincipal[p]?.stx?.balance ?? '0') : '0'
    );
    const totalMicro = sumMicroStxStrings(microBalances);
    const portfolioInner = buildPortfolioSummary(
      totalMicro,
      WATCHLIST_STX_USD_PRICE,
      principals.length,
      lastUpdated
    );
    const stxNums = microBalances.map(m => microToStacks(m));
    const totalStxNum = stxNums.reduce((a, b) => a + b, 0);
    const distributionInner = principals.map((p, i) => ({
      principal: p,
      stx: stxNums[i],
      pct: totalStxNum > 0 ? (stxNums[i] / totalStxNum) * 100 : 0,
    }));
    return {
      portfolio: portfolioInner,
      distribution: distributionInner,
      distributionTotalStx: totalStxNum,
    };
  }, [balanceByPrincipal, balancesReady, principals, lastUpdated]);

  const palette = ['accent.stacks-400', 'accent.bitcoin-500', 'accent.testnet-500', 'iconPrimary'];

  const tableRows = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    const balancePending = !balancesReady && !anyBalanceError;
    let rows = principals.map((p, pi) => {
      const item = itemByPrincipal.get(p)!;
      const bal = balancesReady ? (balanceByPrincipal[p]?.stx?.balance ?? '0') : '0';
      const micro = bal;
      const stxNum = balancesReady ? microToStacks(micro) : 0;
      const usd = balancesReady ? stxNum * WATCHLIST_STX_USD_PRICE : 0;
      const fq = feedQueries[pi];
      const txPending = !!fq && !fq.isSuccess && !fq.isError;
      const totalTx = fq?.data?.total ?? fq?.data?.results?.length ?? 0;
      return {
        item,
        principal: p,
        stxMicro: micro,
        stxNum,
        usd,
        totalTx,
        balancePending,
        balanceError: anyBalanceError,
        txPending,
        txError: !!fq?.isError,
      };
    });

    if (needle) {
      rows = rows.filter(
        r =>
          r.principal.toLowerCase().includes(needle) ||
          (r.item.bnsName && r.item.bnsName.toLowerCase().includes(needle))
      );
    }

    const sorted = [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'stx_desc':
          if (a.balanceError !== b.balanceError) return a.balanceError ? 1 : -1;
          if (a.balancePending !== b.balancePending) return a.balancePending ? 1 : -1;
          return b.stxNum - a.stxNum;
        case 'stx_asc':
          if (a.balanceError !== b.balanceError) return a.balanceError ? 1 : -1;
          if (a.balancePending !== b.balancePending) return a.balancePending ? 1 : -1;
          return a.stxNum - b.stxNum;
        case 'usd_desc':
          if (a.balanceError !== b.balanceError) return a.balanceError ? 1 : -1;
          if (a.balancePending !== b.balancePending) return a.balancePending ? 1 : -1;
          return b.usd - a.usd;
        case 'usd_asc':
          if (a.balanceError !== b.balanceError) return a.balanceError ? 1 : -1;
          if (a.balancePending !== b.balancePending) return a.balancePending ? 1 : -1;
          return a.usd - b.usd;
        case 'added_desc':
          return (a.item.order ?? 0) - (b.item.order ?? 0);
        case 'added_asc':
          return (b.item.order ?? 0) - (a.item.order ?? 0);
        case 'label_asc': {
          const la = (a.item.bnsName || a.principal).toLowerCase();
          const lb = (b.item.bnsName || b.principal).toLowerCase();
          return la.localeCompare(lb);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    anyBalanceError,
    balanceByPrincipal,
    balancesReady,
    debouncedSearch,
    feedQueries,
    principals,
    sortKey,
    itemByPrincipal,
  ]);

  const principalSelectItems = useMemo(
    () =>
      principals.map(p => ({
        value: p,
        label: itemByPrincipal.get(p)?.bnsName || truncateStxAddress(p),
      })),
    [principals, itemByPrincipal]
  );

  const isMdUp = useBreakpointValue({ base: false, md: true }) ?? false;
  const canDragReorder =
    WATCHLIST_DND_ENABLED &&
    isMdUp &&
    sortKey === 'added_desc' &&
    !debouncedSearch.trim();

  const rowDnd = useWatchlistHtml5RowReorder(canDragReorder);

  const onReorderRows = useCallback(
    (from: number, to: number) => {
      const ids = tableRows.map(r => r.principal);
      void reorderRowsByPrincipalOrder(arrayMove(ids, from, to));
    },
    [tableRows, reorderRowsByPrincipalOrder]
  );

  const unifiedTransactions: UnifiedTransaction[] = useMemo(() => {
    const out: UnifiedTransaction[] = [];
    principals.forEach((p, i) => {
      if (txFilterPrincipal !== 'all' && txFilterPrincipal !== p) return;
      const results = feedQueries[i]?.data?.results;
      if (!results) return;
      for (const row of results) {
        const { tx, v2Totals } = unwrapAddressTransactionRow(row);
        const u = transactionToUnified(tx, p, v2Totals);
        if (txFilterType !== 'all' && u.type !== txFilterType) continue;
        out.push(u);
      }
    });
    return out.sort((a, b) => b.timestamp - a.timestamp);
  }, [feedQueries, principals, txFilterPrincipal, txFilterType]);

  const groupedTx = useMemo(() => {
    const buckets: Record<'today' | 'yesterday' | 'earlier', UnifiedTransaction[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const tx of unifiedTransactions) {
      buckets[txGroupLabel(tx.timestamp)].push(tx);
    }
    return buckets;
  }, [unifiedTransactions]);

  const anyError = anyBalanceError || feedQueries.some(q => q.isError);

  const isTxFeedFetching = useMemo(
    () => feedQueries.some(q => q.isFetching),
    [feedQueries]
  );

  /** Pending new page / initial load only — avoid flashing skeleton on interval refetch. */
  const txFeedShowSkeleton = useMemo(() => {
    if (!hydrated || !hasAddresses || principals.length === 0) return false;
    return principals.some((_, i) => feedQueries[i]?.isPending);
  }, [feedQueries, hasAddresses, hydrated, principals]);

  const hasNextTxPage = useMemo(() => {
    if (!hydrated || !hasAddresses) return false;
    if (txFilterPrincipal !== 'all') {
      const i = principals.indexOf(txFilterPrincipal);
      if (i < 0) return false;
      return watchlistAddressTxQueryHasNextPage(
        feedQueries[i],
        currentPage,
        WATCHLIST_TX_ITEMS_PER_PAGE
      );
    }
    return principals.some((_, i) =>
      watchlistAddressTxQueryHasNextPage(
        feedQueries[i],
        currentPage,
        WATCHLIST_TX_ITEMS_PER_PAGE
      )
    );
  }, [currentPage, feedQueries, hasAddresses, hydrated, principals, txFilterPrincipal]);

  const showTxPagination = useMemo(() => {
    if (!hydrated || !hasAddresses) return false;
    if (currentPage > 1) return true;
    return hasNextTxPage || unifiedTransactions.length >= WATCHLIST_TX_ITEMS_PER_PAGE;
  }, [currentPage, hasAddresses, hasNextTxPage, hydrated, unifiedTransactions.length]);

  useEffect(() => {
    if (!hydrated || !hasAddresses) return;
    if (feedQueries.some(q => q.isFetching)) return;
    if (currentPage > 1 && unifiedTransactions.length === 0) {
      setCurrentPage(p => Math.max(1, p - 1));
    }
  }, [
    currentPage,
    feedQueries,
    hasAddresses,
    hydrated,
    unifiedTransactions.length,
  ]);

  const onRetry = useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);

  const onToggleNotify = useCallback(
    (checked: boolean) => {
      const disabled = !checked;
      dispatch(setWatchlistNotificationsDisabled(disabled));
      saveNotificationsDisabled(disabled);
    },
    [dispatch]
  );

  const openRemove = (principal: string) => {
    setRemoveTarget(principal);
    setRemoveOpen(true);
  };

  const confirmRemove = () => {
    if (removeTarget) {
      remove(removeTarget);
    }
    setRemoveTarget(null);
  };

  if (!hydrated) {
    return (
      <Stack gap={6}>
        <Skeleton height="120px" borderRadius="redesign.xl" />
        <Skeleton height="40px" borderRadius="redesign.md" />
        <Skeleton height="240px" borderRadius="redesign.xl" />
      </Stack>
    );
  }

  if (!hasAddresses) {
    return (
      <Card.Root bg="surfaceSecondary" borderRadius="redesign.xl" p={{ base: 8, md: 12 }}>
        <Card.Body>
          <Stack alignItems="center" gap={6} textAlign="center">
            <Icon h={12} w={12} color="iconSecondary">
              <Star weight="bold" />
            </Icon>
            <Stack gap={2}>
              <Text textStyle="heading-md" color="textPrimary">
                Пока нет избранных адресов
              </Text>
              <Text textStyle="text-regular-sm" color="textSecondary" maxW="md">
                Добавляйте адреса звёздочкой на странице адреса, чтобы следить за балансом и
                транзакциями здесь.
              </Text>
            </Stack>
            <Button variant="redesignPrimary" onClick={() => router.push(buildUrl('/', network))}>
              <Flex alignItems="center" gap={2}>
                <Icon h={4} w={4}>
                  <House />
                </Icon>
                Найти адрес
              </Flex>
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Stack gap={8}>
      <Flex justifyContent="space-between" flexWrap="wrap" gap={4} alignItems="flex-start">
        <Stack gap={1}>
          <Text textStyle="heading-lg" color="textPrimary">
            Watchlist
          </Text>
          <Text textStyle="text-regular-sm" color="textSecondary">
            {portfolio.addressesCount} saved · Total{' '}
            {isBalanceFetching && !balancesReady ? (
              <Skeleton
                as="span"
                display="inline-block"
                height="16px"
                width="100px"
                verticalAlign="middle"
              />
            ) : (
              <>
                <Text as="span" fontWeight="semibold" color="textPrimary">
                  {microToStacksFormatted(portfolio.totalStx)} STX
                </Text>{' '}
                <Text as="span" color="textSecondary">
                  ({formatWatchlistUsdFromMicroStx(portfolio.totalStx)})
                </Text>
              </>
            )}
          </Text>
          <Text textStyle="text-regular-xs" color="textSecondary" suppressHydrationWarning>
            Загружено {loadedCount} из {totalCount} адресов · Last updated:{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
          </Text>
        </Stack>
        <Flex alignItems="center" gap={4} flexWrap="wrap">
          <Checkbox
            checked={!notificationsDisabled}
            onCheckedChange={d => onToggleNotify(!!d.checked)}
          >
            Transaction toasts
          </Checkbox>
          <Button variant="redesignTertiary" size="small" onClick={onRetry}>
            <Flex alignItems="center" gap={2}>
              <Icon h={4} w={4}>
                <ArrowClockwise />
              </Icon>
              Retry
            </Flex>
          </Button>
        </Flex>
      </Flex>

      {anyError ? (
        <Box
          p={4}
          borderRadius="redesign.md"
          bg="surfacePrimary"
          borderWidth="1px"
          borderColor="redesignBorderSecondary"
        >
          <Text textStyle="text-regular-sm" color="textPrimary">
            Some data could not be loaded. Check your connection or API availability.
          </Text>
        </Box>
      ) : null}

      <Card.Root bg="surfaceSecondary" borderRadius="redesign.xl" p={5}>
        <Card.Body>
          <Text textStyle="heading-sm" mb={3} color="textPrimary">
            Balance distribution
          </Text>
          {isBalanceFetching && !balancesReady ? (
            <Skeleton height="12px" w="full" borderRadius="full" mb={4} />
          ) : distributionTotalStx <= 0 ? (
            <Text textStyle="text-regular-sm" color="textSecondary" mb={4}>
              Нет средств
            </Text>
          ) : (
            <Flex h={3} w="full" borderRadius="full" overflow="hidden" bg="surfacePrimary" mb={4}>
              {distribution.map((d, idx) =>
                d.stx > 0 ? (
                  <Box
                    key={d.principal}
                    flex={`${d.pct} 1 0`}
                    minW={d.pct > 0 ? '2px' : 0}
                    bg={palette[idx % palette.length]}
                    title={`${truncateStxAddress(d.principal)} · ${d.pct.toFixed(1)}%`}
                  />
                ) : null
              )}
            </Flex>
          )}
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
            {distribution.map((d, idx) => (
              <Flex key={d.principal} justifyContent="space-between" gap={2}>
                <Flex alignItems="center" gap={2} minW={0}>
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={palette[idx % palette.length]}
                    flexShrink={0}
                  />
                  <NextLink
                    href={buildUrl(`/address/${encodeURIComponent(d.principal)}`, network)}
                    variant="noUnderline"
                  >
                    <Text textStyle="text-regular-sm" color="accent.stacks-600" truncate>
                      {sortedItems.find(i => i.principal === d.principal)?.bnsName ||
                        truncateStxAddress(d.principal)}
                    </Text>
                  </NextLink>
                </Flex>
                <Text textStyle="text-medium-sm" color="textPrimary">
                  {d.pct.toFixed(1)}% ·{' '}
                  {formatWatchlistUsdFromMicroStx(
                    balancesReady ? (balanceByPrincipal[d.principal]?.stx?.balance ?? '0') : '0'
                  )}
                </Text>
              </Flex>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>

      <Stack gap={4}>
        <Flex flexWrap="wrap" gap={3} alignItems="center">
          <Input
            placeholder="Search address or BNS"
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxW="280px"
            bg="surfacePrimary"
            borderRadius="redesign.md"
          />
          <NativeSelectRoot width={{ base: 'full', md: '220px' }}>
            <NativeSelectField
              value={sortKey}
              items={[...SORT_OPTIONS]}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setSortKey(e.target.value as SortKey)
              }
            />
          </NativeSelectRoot>
        </Flex>

        <Box display={{ base: 'block', md: 'none' }}>
          <Stack gap={3}>
            {tableRows.map(row => (
              <Card.Root key={row.principal} bg="surfaceSecondary" borderRadius="redesign.xl">
                <Card.Body>
                  <Stack gap={3}>
                    <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
                      <Stack gap={1} minW={0}>
                        {row.item.bnsName ? (
                          <NextLink
                            href={buildUrl(
                              `/address/${encodeURIComponent(row.principal)}`,
                              network
                            )}
                            variant="noUnderline"
                          >
                            <Text textStyle="text-medium-sm" color="textPrimary" truncate>
                              {row.item.bnsName}
                            </Text>
                          </NextLink>
                        ) : null}
                        <Text
                          textStyle="text-regular-xs"
                          color="textSecondary"
                          fontFamily="mono"
                          truncate
                        >
                          {row.principal}
                        </Text>
                      </Stack>
                      <Button
                        variant="redesignTertiary"
                        size="small"
                        aria-label="Remove from watchlist"
                        onClick={() => openRemove(row.principal)}
                      >
                        <Icon h={4} w={4}>
                          <Trash />
                        </Icon>
                      </Button>
                    </Flex>
                    <Separator />
                    <Flex justifyContent="space-between" alignItems="center">
                      <Text textStyle="text-regular-xs" color="textSecondary">
                        STX
                      </Text>
                      {row.balancePending ? (
                        <Skeleton height="14px" width="80px" />
                      ) : row.balanceError ? (
                        <Text textStyle="text-medium-sm" title={WATCHLIST_CELL_LOAD_ERROR_TITLE}>
                          {microToStacksFormatted('0')}
                        </Text>
                      ) : (
                        <Text textStyle="text-medium-sm">
                          {microToStacksFormatted(row.stxMicro)}
                        </Text>
                      )}
                    </Flex>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Text textStyle="text-regular-xs" color="textSecondary">
                        USD (STX)
                      </Text>
                      <Text
                        textStyle="text-medium-sm"
                        title={row.balanceError ? WATCHLIST_CELL_LOAD_ERROR_TITLE : undefined}
                      >
                        {formatWatchlistUsdFromMicroStx(
                          row.balancePending || row.balanceError ? '0' : row.stxMicro
                        )}
                      </Text>
                    </Flex>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Text textStyle="text-regular-xs" color="textSecondary">
                        Transactions
                      </Text>
                      {row.txPending ? (
                        <Skeleton height="14px" width="48px" />
                      ) : row.txError ? (
                        <Text textStyle="text-medium-sm" title={WATCHLIST_CELL_LOAD_ERROR_TITLE}>
                          0
                        </Text>
                      ) : (
                        <Text textStyle="text-medium-sm">{row.totalTx}</Text>
                      )}
                    </Flex>
                    <Flex justifyContent="space-between">
                      <Text textStyle="text-regular-xs" color="textSecondary">
                        Added
                      </Text>
                      <Text textStyle="text-medium-sm">
                        {new Date(row.item.addedAt).toLocaleDateString()}
                      </Text>
                    </Flex>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        </Box>

        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
          <Table.Root size="sm" layerStyle="simple" css={{ tableLayout: 'auto', width: 'full' }}>
            <Table.Header>
              <Table.Row>
                {WATCHLIST_DND_ENABLED ? (
                  <Table.ColumnHeader w="40px" aria-label="Reorder watchlist rows" />
                ) : null}
                <Table.ColumnHeader>Address</Table.ColumnHeader>
                <Table.ColumnHeader>STX</Table.ColumnHeader>
                <Table.ColumnHeader>USD (STX)</Table.ColumnHeader>
                <Table.ColumnHeader>Tx count</Table.ColumnHeader>
                <Table.ColumnHeader>Added</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tableRows.map((row, rowIndex) => (
                <WatchlistDraggableRow
                  key={row.principal}
                  rowIndex={rowIndex}
                  dndEnabled={canDragReorder}
                  dragSourceIndex={rowDnd.dragSourceIndex}
                  dropTargetIndex={rowDnd.dropTargetIndex}
                  onDragOver={rowDnd.handleDragOver}
                  onDragLeave={rowDnd.handleDragLeave}
                  onDrop={(e, i) => rowDnd.handleDrop(e, i, onReorderRows)}
                  onDragEnd={rowDnd.handleDragEnd}
                >
                  {WATCHLIST_DND_ENABLED ? (
                    <Table.Cell>
                      <WatchlistDragHandle
                        rowIndex={rowIndex}
                        active={canDragReorder}
                        onDragStart={rowDnd.handleDragStart}
                        onDragEnd={rowDnd.handleDragEnd}
                      />
                    </Table.Cell>
                  ) : null}
                  <Table.Cell>
                    <WatchlistTableAddressCell
                      principal={row.principal}
                      bnsName={row.item.bnsName}
                      network={network}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    {row.balancePending ? (
                      <Skeleton height="16px" width="88px" />
                    ) : row.balanceError ? (
                      <Text textStyle="text-medium-sm" title={WATCHLIST_CELL_LOAD_ERROR_TITLE}>
                        {microToStacksFormatted('0')}
                      </Text>
                    ) : (
                      microToStacksFormatted(row.stxMicro)
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text
                      as="span"
                      title={row.balanceError ? WATCHLIST_CELL_LOAD_ERROR_TITLE : undefined}
                    >
                      {formatWatchlistUsdFromMicroStx(
                        row.balancePending || row.balanceError ? '0' : row.stxMicro
                      )}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {row.txPending ? (
                      <Skeleton height="16px" width="40px" />
                    ) : row.txError ? (
                      <Text textStyle="text-medium-sm" title={WATCHLIST_CELL_LOAD_ERROR_TITLE}>
                        0
                      </Text>
                    ) : (
                      row.totalTx
                    )}
                  </Table.Cell>
                  <Table.Cell>{new Date(row.item.addedAt).toLocaleDateString()}</Table.Cell>
                  <Table.Cell textAlign="end">
                    <Button
                      variant="redesignTertiary"
                      size="small"
                      onClick={() => openRemove(row.principal)}
                    >
                      Remove
                    </Button>
                  </Table.Cell>
                </WatchlistDraggableRow>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Stack>

      <Stack ref={combinedTxSectionRef} gap={4}>
        <Text textStyle="heading-md" color="textPrimary">
          Combined transactions
        </Text>
        <Flex flexWrap="wrap" gap={3}>
          <NativeSelectRoot width={{ base: 'full', md: '200px' }}>
            <NativeSelectField
              value={txFilterType}
              items={[
                { value: 'all', label: 'All types' },
                { value: 'transfer', label: 'Transfers' },
                { value: 'contract_call', label: 'Contract calls' },
                { value: 'token_transfer', label: 'Token' },
              ]}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setTxFilterType(e.target.value as UnifiedTxType | 'all');
              }}
            />
          </NativeSelectRoot>
          <NativeSelectRoot width={{ base: 'full', md: '260px' }}>
            <NativeSelectField
              value={txFilterPrincipal}
              items={[{ value: 'all', label: 'All watchlist addresses' }, ...principalSelectItems]}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setTxFilterPrincipal(e.target.value);
              }}
            />
          </NativeSelectRoot>
        </Flex>

        {txFeedShowSkeleton ? (
          <Stack gap={3} data-testid="watchlist-tx-loading">
            <Skeleton height="96px" w="full" borderRadius="redesign.lg" />
            <Skeleton height="96px" w="full" borderRadius="redesign.lg" />
            <Skeleton height="96px" w="full" borderRadius="redesign.lg" />
          </Stack>
        ) : (
          <Stack gap={6}>
            {GROUP_ORDER.map(group => {
              const txs = groupedTx[group];
              if (!txs.length) return null;
              return (
                <Stack key={group} gap={3}>
                  <Text textStyle="heading-sm" color="textSecondary">
                    {GROUP_LABEL[group]}
                  </Text>
                  <Stack gap={2}>
                    {txs.map(tx => (
                      <Card.Root
                        key={`${tx.principal}-${tx.txId}`}
                        bg="surfaceSecondary"
                        borderRadius="redesign.lg"
                      >
                        <Card.Body p={4}>
                          <Flex justifyContent="space-between" flexWrap="wrap" gap={3}>
                            <Stack gap={1} minW={0}>
                              <NextLink
                                href={buildUrl(`/txid/${tx.txId}`, network)}
                                variant="noUnderline"
                              >
                                <Text textStyle="text-medium-sm" color="accent.stacks-600" truncate>
                                  {tx.txId}
                                </Text>
                              </NextLink>
                              <Flex
                                alignItems="center"
                                gap={1.5}
                                flexWrap="wrap"
                                textStyle="text-regular-xs"
                                color="textSecondary"
                              >
                                <Text as="span">{tx.type}</Text>
                                <Text as="span">·</Text>
                                <Flex
                                  as="span"
                                  alignItems="center"
                                  aria-label={tx.direction === 'in' ? 'Incoming' : 'Outgoing'}
                                >
                                  <Icon
                                    h={3.5}
                                    w={3.5}
                                    color={tx.direction === 'in' ? 'feedback.green-500' : 'iconError'}
                                  >
                                    {tx.direction === 'in' ? (
                                      <ArrowDownLeft weight="bold" />
                                    ) : (
                                      <ArrowUpRight weight="bold" />
                                    )}
                                  </Icon>
                                </Flex>
                                <Text as="span">·</Text>
                                <Text as="span">
                                  watched{' '}
                                  {itemByPrincipal.get(tx.principal)?.bnsName ||
                                    truncateStxAddress(tx.principal)}
                                </Text>
                              </Flex>
                            </Stack>
                            <Stack alignItems="flex-end" gap={1}>
                              <Text textStyle="text-medium-sm">
                                {tx.amount !== '0' ? `${microToStacksFormatted(tx.amount)} STX` : '—'}
                              </Text>
                              <Text textStyle="text-regular-xs" color="textSecondary">
                                {formatWatchlistUsdFromMicroStx(tx.amount)}
                              </Text>
                              <Text
                                textStyle="text-regular-xs"
                                color="textSecondary"
                                suppressHydrationWarning
                              >
                                {tx.timestamp
                                  ? new Date(tx.timestamp * 1000).toLocaleString()
                                  : 'Pending'}
                              </Text>
                            </Stack>
                          </Flex>
                        </Card.Body>
                      </Card.Root>
                    ))}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}

        {showTxPagination ? (
          <Flex justifyContent="center" w="full" data-testid="watchlist-tx-pagination">
            <ButtonGroup attached size="sm" variant="outline">
              <Button
                variant="redesignTertiary"
                size="small"
                aria-label="Previous page"
                disabled={currentPage <= 1 || isTxFeedFetching}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button variant="redesignTertiary" size="small" pointerEvents="none" tabIndex={-1}>
                {currentPage}
              </Button>
              <Button
                variant="redesignTertiary"
                size="small"
                aria-label="Next page"
                disabled={!hasNextTxPage || isTxFeedFetching}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </ButtonGroup>
          </Flex>
        ) : null}
      </Stack>

      <RemoveFromWatchlistDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        addressLabel={
          removeTarget
            ? itemByPrincipal.get(removeTarget)?.bnsName || truncateStxAddress(removeTarget)
            : ''
        }
        onConfirm={confirmRemove}
      />
    </Stack>
  );
}
