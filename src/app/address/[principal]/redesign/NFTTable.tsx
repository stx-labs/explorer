import { Card } from '@/common/components/Card';
import { TablePaginationControls } from '@/common/components/table/TablePaginationControls';
import { useBulkFtMetadata } from '@/common/queries/useBulkTokenMetadata';
import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { getContractIdFromAssetId } from '@/common/utils/utils';
import { Box, Flex, Grid } from '@chakra-ui/react';
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

  // Cursors only apply to the principal they came from, so start over from the first page on
  // client-side navigation to another address.
  const [cursorsPrincipal, setCursorsPrincipal] = useState(principal);
  if (cursorsPrincipal !== principal) {
    setCursorsPrincipal(principal);
    setPageCursors([undefined]);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  const { data: nftHoldings } = useNftHoldings(
    principal,
    pagination.pageSize,
    cursorsPrincipal === principal ? pageCursors[pagination.pageIndex] : undefined
  );
  const nextCursor = nftHoldings?.cursor?.next ?? undefined;

  const handlePageChange = useCallback(
    (page: PaginationState) => {
      const isNextPage = page.pageIndex === pagination.pageIndex + 1;
      const isVisitedPage = page.pageIndex < pageCursors.length;
      if (isNextPage && !isVisitedPage) {
        if (!nextCursor) return;
        setPageCursors(prev => [...prev, nextCursor]);
      } else if (!isVisitedPage) {
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

  const shouldShowPagination = totalRows > ITEMS_PER_PAGE;

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
      </Card>
      {shouldShowPagination && (
        <Flex justifyContent="center">
          <TablePaginationControls
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            totalRows={totalRows}
            onPageChange={handlePageChange}
            previousNextOnly
          />
        </Flex>
      )}
    </Box>
  );
}
