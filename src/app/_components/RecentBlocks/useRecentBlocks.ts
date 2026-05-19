'use client';

import { getBlocksV2ListQueryKey, useBlocksV2List } from '@/app/blocks/queries/useBlocksV2Queries';
import { useHomePageData } from '@/app/context';
import { getBurnBlocksQueryKey, useBurnBlocks } from '@/common/queries/useBurnBlocksInfinite';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Block, NakamotoBlock } from '@stacks/stacks-blockchain-api-types';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { logError } from '../../../common/utils/error-utils';
import { useSubscribeBlocks } from '../BlockList/Sockets/useSubscribeBlocks';
import { RECENT_BTC_BLOCKS_COUNT, RECENT_STX_BLOCKS_COUNT } from './consts';

export type RecentBlocksType = 'btc' | 'stx';

const isNewStxBlock = (block: NakamotoBlock | Block, lastBlockHeight: number | undefined) => {
  if (lastBlockHeight == null) return false;
  return block.height > lastBlockHeight;
};

const isNewBtcBlock = (block: NakamotoBlock | Block, lastBlockHeight: number | undefined) => {
  if (lastBlockHeight == null) return false;
  return block.burn_block_height > lastBlockHeight;
};

// Handle getting stx blocks data. If there is initial stx blocks data, set it in the cache and use it. Otherwise, query for the data
const useStxBlocks = () => {
  const activeNetwork = useGlobalContext().activeNetwork;
  const queryClient = useQueryClient();

  const { initialRecentBlocks } = useHomePageData();
  const recentStxBlocks = initialRecentBlocks?.stxBlocks;

  const isStxBlocksCacheSetWithInitialData = useRef(false);
  useEffect(() => {
    if (isStxBlocksCacheSetWithInitialData.current === false && recentStxBlocks) {
      const queryKey = getBlocksV2ListQueryKey(RECENT_STX_BLOCKS_COUNT, activeNetwork.url);
      queryClient.setQueryData(queryKey, recentStxBlocks);
      isStxBlocksCacheSetWithInitialData.current = true;
    }
  }, [recentStxBlocks, activeNetwork.url, queryClient]);

  const { data: stxBlocksData, refetch: stxRefetch } = useBlocksV2List(RECENT_STX_BLOCKS_COUNT);

  const stxBlocks = stxBlocksData?.results || [];
  return { stxBlocks, stxRefetch };
};

// Handle getting btc blocks data. If there is initial btc blocks data, set it in the cache and use it. Otherwise, query for the data
const useBtcBlocks = () => {
  const { initialRecentBlocks } = useHomePageData();
  const activeNetwork = useGlobalContext().activeNetwork;

  const queryClient = useQueryClient();

  const recentBtcBlocks = initialRecentBlocks?.btcBlocks;
  const isBtcBlocksCacheSetWithInitialData = useRef(false);

  useEffect(() => {
    if (isBtcBlocksCacheSetWithInitialData.current === false && recentBtcBlocks) {
      const queryKey = getBurnBlocksQueryKey(RECENT_BTC_BLOCKS_COUNT, 0, activeNetwork.url);
      queryClient.setQueryData(queryKey, recentBtcBlocks);
      isBtcBlocksCacheSetWithInitialData.current = true;
    }
  }, [recentBtcBlocks, activeNetwork.url, queryClient]);

  const { data: btcBlocksData, refetch: btcRefetch } = useBurnBlocks(RECENT_BTC_BLOCKS_COUNT, 0);

  const btcBlocks = btcBlocksData?.results || [];
  return { btcBlocks, btcRefetch };
};

export function useRecentBlocks(recentBlocksType: RecentBlocksType) {
  const [hasNewBtcBlocks, setHasNewBtcBlocks] = useState(false);
  const [hasNewStxBlocks, setHasNewStxBlocks] = useState(false);
  const [socketEnabled, setSocketEnabled] = useState(true);

  const { stxBlocks, stxRefetch } = useStxBlocks();
  const newestStxBlockHeight = stxBlocks[0]?.height;

  const { btcBlocks, btcRefetch } = useBtcBlocks();
  const newestBtcBlockHeight = btcBlocks[0]?.burn_block_height;

  useEffect(() => {}, [recentBlocksType, socketEnabled, hasNewBtcBlocks, hasNewStxBlocks]);

  // Update socketEnabled state when we have new blocks for the selected type or when we switch tabs
  useEffect(() => {
    // When we get new blocks for the selected type, we turn the socket off
    if (recentBlocksType === 'btc' && hasNewBtcBlocks && socketEnabled) {
      setSocketEnabled(false);
    }
    if (recentBlocksType === 'stx' && hasNewStxBlocks && socketEnabled) {
      setSocketEnabled(false);
    }

    // However, we need to consider turning the socket back on when we switch tabs, if, for the selected type, we don't have new blocks
    if (recentBlocksType === 'btc' && !hasNewBtcBlocks && !socketEnabled) {
      setSocketEnabled(true);
    }
    if (recentBlocksType === 'stx' && !hasNewStxBlocks && !socketEnabled) {
      setSocketEnabled(true);
    }
  }, [hasNewBtcBlocks, hasNewStxBlocks, recentBlocksType, socketEnabled]);

  // When a new block is received, update the hasNewBlocks state for the selected type
  const handleNewBlock = useCallback(
    (block: NakamotoBlock | Block) => {
      if (isNewBtcBlock(block, newestBtcBlockHeight)) {
        setHasNewBtcBlocks(true);
      }
      if (isNewStxBlock(block, newestStxBlockHeight)) {
        setHasNewStxBlocks(true);
      }
    },
    [newestBtcBlockHeight, newestStxBlockHeight]
  );

  // When we click the update button, refetch the data and reset the hasNewBlocks state for the selected type and enable the socket as we need to listen for new blocks
  const handleUpdate = useCallback(() => {
    if (recentBlocksType === 'btc') {
      btcRefetch();
      setHasNewBtcBlocks(false);
    } else {
      stxRefetch();
      setHasNewStxBlocks(false);
    }
    setSocketEnabled(true);
  }, [recentBlocksType, btcRefetch, stxRefetch]);

  // Subscribe to new blocks
  useSubscribeBlocks(socketEnabled, handleNewBlock, error => {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      'recent-blocks-socket-subscribe',
      undefined,
      'warning'
    );
  });

  return {
    stxBlocks,
    btcBlocks,
    hasNewBtcBlocks,
    hasNewStxBlocks,
    handleUpdate,
  };
}
