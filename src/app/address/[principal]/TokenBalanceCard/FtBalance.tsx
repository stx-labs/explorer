'use client';

import { Box, Grid } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import * as React from 'react';
import { useMemo, useState } from 'react';

import { AddressBalanceResponse } from '@stacks/stacks-blockchain-api-types';

import { TwoColumnsListItemSkeleton } from '../../../../common/components/TwoColumnsListItemSkeleton';
import { useBulkFtMetadata } from '../../../../common/queries/useBulkTokenMetadata';
import { getContractIdFromAssetId } from '../../../../common/utils/utils';
import { Button } from '../../../../ui/Button';
import { Caption } from '../../../../ui/typography';

const TokenAssetListItem = dynamic(
  () => import('./TokenAssetListItem').then(mod => mod.TokenAssetListItem),
  {
    loading: () => (
      <TwoColumnsListItemSkeleton leftContentTitle leftContentSubtitle rightContentTitle />
    ),
    ssr: false,
  }
);

const ITEMS_PER_PAGE = 5;

export const FtBalance: React.FC<{ balance: AddressBalanceResponse }> = ({ balance }) => {
  const ftWithCount = Object.keys(balance.fungible_tokens).filter(
    key => Number(balance.fungible_tokens[key]?.balance) > 0
  );

  const [visibleItemsCount, setVisibleItemsCount] = useState(ITEMS_PER_PAGE);

  const handleLoadMore = () => {
    setVisibleItemsCount(prevCount => Math.min(prevCount + ITEMS_PER_PAGE, ftWithCount.length));
  };

  const visibleFt = ftWithCount.slice(0, visibleItemsCount);

  const contractIds = useMemo(() => visibleFt.map(getContractIdFromAssetId), [visibleFt]);

  const { metadataMap } = useBulkFtMetadata(contractIds);

  return ftWithCount.length > 0 ? (
    <Box pb={4}>
      <Box>
        {visibleFt.map((key, index) => {
          const contractId = getContractIdFromAssetId(key);
          return (
            <TokenAssetListItem
              amount={balance.fungible_tokens[key]?.balance || ''}
              key={index}
              token={key}
              tokenType="fungible_tokens"
              ftMetadata={metadataMap.get(contractId)}
            />
          );
        })}
      </Box>
      {visibleItemsCount < ftWithCount.length && (
        <Box width={'full'}>
          <Button variant="secondary" onClick={() => handleLoadMore()} width={'full'}>
            Load more
          </Button>
        </Box>
      )}
    </Box>
  ) : (
    <Grid minHeight="220px" textAlign="center" placeItems="center" padding="16px">
      <Caption>This account has no tokens.</Caption>
    </Grid>
  );
};
