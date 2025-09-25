import { Card } from '@/common/components/Card';
import { TablePaginationControls } from '@/common/components/table/TablePaginationControls';
import {
  convertBalancesToArrayWithAssetId,
  paginateBalances,
  removeUndefinedFromBalances,
  removeZeroBalanceData,
} from '@/common/components/table/fungible-tokens-table/useFungibleTokens';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useSuspenseNftHoldings } from '@/common/queries/useNftHoldings';
import { Box, Flex, Grid } from '@chakra-ui/react';
import { NftMetadataResponse } from '@hirosystems/token-metadata-api-client';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

import { NftBalance } from '@stacks/stacks-blockchain-api-types';
import { cvToJSON, hexToCV } from '@stacks/transactions';

import { useAddressIdPageData } from '../AddressIdPageContext';
import { useBnsNames } from '../TokenBalanceCard/useBnsNames';
import { CollectibleCard } from './CollectibleCard';

const ITEMS_PER_PAGE = 10;

export type NftBalanceWithAssetId = NftBalance & { asset_identifier: string };

type NftData = NftMetadataResponse & NftBalanceWithAssetId;

const emptyNftBalance: NftBalanceWithAssetId = {
  count: '',
  total_sent: '',
  total_received: '',
  asset_identifier: '',
};

const emptyMetadata: NftMetadataResponse = {
  token_uri: undefined,
  metadata: undefined,
};

const emptyNftData: NftData = {
  ...emptyNftBalance,
  ...emptyMetadata,
};

function useFormattedNFTBalances(
  nftBalances: Record<string, NftBalance | undefined>,
  limit: number,
  offset: number
) {
  const definedNftBalances = removeUndefinedFromBalances<NftBalance>(nftBalances || {});
  const positiveNftBalances = removeZeroBalanceData<NftBalance>(definedNftBalances);
  const nftBalancesArray = convertBalancesToArrayWithAssetId<NftBalance>(positiveNftBalances);
  const paginatedBalances = paginateBalances<NftBalanceWithAssetId>(
    nftBalancesArray,
    limit,
    offset
  );
  return paginatedBalances;
}

export function NFTTable() {
  const { principal, initialAddressBalancesData } = useAddressIdPageData();

  const { data: nftHoldings } = useSuspenseNftHoldings(principal);
  const { activeNetwork } = useGlobalContext();
  const { bnsNames } = useBnsNames(nftHoldings, activeNetwork.mode);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ITEMS_PER_PAGE,
  });

  const handlePageChange = useCallback((page: PaginationState) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: page.pageIndex,
    }));
    window?.scrollTo(0, 0); // Smooth scroll to top
  }, []);

  const formattedBalances = useFormattedNFTBalances(
    initialAddressBalancesData?.non_fungible_tokens || {},
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize
  );

  return (
    <Box>
      <Card h="full" w="full" p={3} borderColor="redesignBorderSecondary" bg="transparent">
        <Grid templateColumns="repeat(auto-fill, 162px);" gap={4} p={4}>
          {formattedBalances.map(item => {
            const holdings = nftHoldings?.results.filter(
              nftHolding => nftHolding.asset_identifier === item.asset_identifier
            )[0];
            const hex = holdings?.value.hex;
            const cv = hexToCV(hex);
            const json = cvToJSON(cv);
            const value = json.value;
            const firstNftValue = typeof value === 'string' ? BigInt(value) : value;
            return (
              <CollectibleCard
                key={item.asset_identifier}
                assetId={item.asset_identifier}
                tokenId={firstNftValue}
                {...item}
              />
            );
          })}
        </Grid>
      </Card>
      <Flex justifyContent="center">
        <TablePaginationControls
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          totalRows={Object.keys(initialAddressBalancesData?.non_fungible_tokens || {}).length}
          onPageChange={handlePageChange}
        />
      </Flex>
    </Box>
  );
}
