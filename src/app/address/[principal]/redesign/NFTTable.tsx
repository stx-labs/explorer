import { Card } from '@/common/components/Card';
import { TablePaginationControls } from '@/common/components/table/TablePaginationControls';
import { useBulkFtMetadata } from '@/common/queries/useBulkTokenMetadata';
import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { getContractIdFromAssetId } from '@/common/utils/utils';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Grid, Stack } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

import { cvToJSON, hexToCV } from '@stacks/transactions';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { CollectibleCard } from './CollectibleCard';

const ITEMS_PER_PAGE = 10;

interface NftItem {
  assetId: string;
  tokenId: bigint | string | undefined;
  contractId: string;
}

export function NFTTable() {
  const { principal } = useAddressIdPageData();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ITEMS_PER_PAGE,
  });
  // Holdings are cursor-paginated: pageCursors[i] is the cursor that fetches page i. The first page
  // needs no cursor; each later one is learned from the previous page's `cursor.next`.
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);

  // Cursors only apply to the principal and API they came from; AddressTabs remounts this table
  // (resetting the page and cursors) when either changes.
  const {
    data: nftHoldings,
    isError,
    refetch,
  } = useNftHoldings(principal, pagination.pageSize, pageCursors[pagination.pageIndex]);
  const nextCursor = nftHoldings?.cursor?.next ?? undefined;

  const handlePageChange = useCallback(
    (page: PaginationState) => {
      if (page.pageIndex === pagination.pageIndex + 1) {
        // Always step forward with the cursor of the page on screen, never one stored on an earlier
        // visit: the page may have refetched since, and an old cursor would skip or repeat NFTs.
        if (!nextCursor) return;
        setPageCursors(prev => [...prev.slice(0, page.pageIndex), nextCursor]);
      } else if (page.pageIndex < 0 || page.pageIndex >= pageCursors.length) {
        return;
      }
      setPagination(prev => ({
        ...prev,
        pageIndex: page.pageIndex,
      }));
      window?.scrollTo(0, 0); // Smooth scroll to top
    },
    [pagination.pageIndex, pageCursors.length, nextCursor]
  );

  const totalRows = nftHoldings?.total ?? 0;

  // Keep the pager on later pages even if the total shrinks, so the user can always get back.
  const shouldShowPagination =
    pagination.pageIndex > 0 || totalRows > ITEMS_PER_PAGE || !!nextCursor;

  // Parse NFT items and extract contract IDs with token IDs for bulk search
  const nftItems: NftItem[] = useMemo(() => {
    if (!nftHoldings?.results) return [];
    return nftHoldings.results.map(nft => {
      const hex = nft.value.hex;
      const cv = hexToCV(hex);
      const json = cvToJSON(cv);
      const value = json.value;
      const isNumericString = typeof value === 'string' && /^\d+$/.test(value);
      const tokenId = isNumericString ? BigInt(value) : value;
      return {
        assetId: nft.asset_identifier,
        tokenId,
        contractId: getContractIdFromAssetId(nft.asset_identifier),
      };
    });
  }, [nftHoldings?.results]);

  // Use bulk search with PRINCIPAL:TOKEN_NUMBER format for NFTs
  const bulkSearchIds = useMemo(() => {
    return nftItems
      .filter(item => item.tokenId !== undefined)
      .map(item => `${item.contractId}:${item.tokenId}`);
  }, [nftItems]);

  const { metadataMap } = useBulkFtMetadata(bulkSearchIds);

  return (
    <Box>
      <Card h="full" w="full" p={3} borderColor="redesignBorderSecondary" bg="transparent">
        {isError ? (
          <Stack gap={3} alignItems="flex-start" p={4}>
            <Text fontSize="sm">Failed to load collectibles.</Text>
            <Button variant="redesignPrimary" onClick={() => refetch()}>
              Try again
            </Button>
          </Stack>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(162px, 1fr));" gap={4} p={4}>
            {nftItems.map(item => {
              const searchKey = `${item.contractId}:${item.tokenId}`;
              const metadata = metadataMap.get(searchKey) ?? metadataMap.get(item.contractId);
              return (
                <CollectibleCard
                  key={`${item.assetId}-${item.tokenId}`}
                  assetId={item.assetId}
                  tokenId={item.tokenId}
                  metadataImageUrl={metadata?.metadata?.cached_image}
                />
              );
            })}
          </Grid>
        )}
      </Card>
      {shouldShowPagination && (
        <Flex justifyContent="center">
          <TablePaginationControls
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            totalRows={totalRows}
            onPageChange={handlePageChange}
            previousNextOnly
            hasNextPage={!!nextCursor}
          />
        </Flex>
      )}
    </Box>
  );
}
