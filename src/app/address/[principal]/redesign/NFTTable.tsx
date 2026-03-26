import { Card } from '@/common/components/Card';
import { TablePaginationControls } from '@/common/components/table/TablePaginationControls';
import { useBulkFtMetadata } from '@/common/queries/useBulkTokenMetadata';
import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { getContractIdFromAssetId } from '@/common/utils/utils';
import { Box, Flex, Grid } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

import { NftBalance } from '@stacks/stacks-blockchain-api-types';
import { cvToJSON, hexToCV } from '@stacks/transactions';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { CollectibleCard } from './CollectibleCard';

const ITEMS_PER_PAGE = 10;

export type NftBalanceWithAssetId = NftBalance & { asset_identifier: string };

interface NftItem {
  assetId: string;
  tokenId: bigint | string | undefined;
  contractId: string;
}

export function NFTTable() {
  const { principal, initialAddressBalancesData } = useAddressIdPageData();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ITEMS_PER_PAGE,
  });
  const { data: nftHoldings } = useNftHoldings(
    principal,
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize
  );

  const handlePageChange = useCallback((page: PaginationState) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: page.pageIndex,
    }));
    window?.scrollTo(0, 0); // Smooth scroll to top
  }, []);

  const totalRows = Object.entries(initialAddressBalancesData?.non_fungible_tokens || {}).reduce(
    (acc, [_, nft]) => acc + (Number(nft?.count) || 0),
    0
  );

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
          />
        </Flex>
      )}
    </Box>
  );
}
