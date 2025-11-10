import { Card } from '@/common/components/Card';
import { TablePaginationControls } from '@/common/components/table/TablePaginationControls';
import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { Box, Flex, Grid } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

import { NftBalance } from '@stacks/stacks-blockchain-api-types';
import { cvToJSON, hexToCV } from '@stacks/transactions';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { CollectibleCard } from './CollectibleCard';

const ITEMS_PER_PAGE = 10;

export type NftBalanceWithAssetId = NftBalance & { asset_identifier: string };

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

  return (
    <Box>
      <Card h="full" w="full" p={3} borderColor="redesignBorderSecondary" bg="transparent">
        <Grid templateColumns="repeat(auto-fill, minmax(162px, 1fr));" gap={4} p={4}>
          {nftHoldings?.results.map(nft => {
            const hex = nft.value.hex;
            const cv = hexToCV(hex);
            const json = cvToJSON(cv);
            const value = json.value;
            const firstNftValue = typeof value === 'string' ? BigInt(value) : value;
            return (
              <CollectibleCard
                key={`${nft.asset_identifier}-${firstNftValue}`}
                assetId={nft.asset_identifier}
                tokenId={firstNftValue}
                {...nft}
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
