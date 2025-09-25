import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { NUM_TEN_MINUTES_IN_DAY } from '@/common/utils/consts';
import { getApiUrl } from '@/common/utils/network-utils';
import { MICROSTACKS_IN_STACKS } from '@/common/utils/utils';

import {
  Block,
  BurnBlock,
  MempoolTransactionStatsResponse,
  NakamotoBlock,
} from '@stacks/stacks-blockchain-api-types';

import {
  RECENT_BTC_BLOCKS_COUNT,
  RECENT_STX_BLOCKS_COUNT,
} from './_components/RecentBlocks/consts';
import { TXS_LIST_SIZE } from './consts';
import { CompressedTxTableData, compressTransactions } from './transactions/utils';

export type UIBtcBlock = Pick<
  BurnBlock,
  'burn_block_height' | 'burn_block_time' | 'burn_block_hash' | 'stacks_blocks' | 'total_tx_count'
>;

export type UIStxBlock = Pick<
  Block,
  'hash' | 'height' | 'burn_block_time' | 'burn_block_height' | 'burn_block_hash' | 'block_time'
> & {
  tx_count: number;
};

export type UIMempoolStats = Pick<MempoolTransactionStatsResponse, 'tx_type_counts'>;

export interface RecentBlocks {
  btcBlocks: GenericResponseType<UIBtcBlock>;
  stxBlocks: GenericResponseType<UIStxBlock>;
  stxBlocksCountPerBtcBlock: Array<{
    burn_block_height: number;
    burn_block_hash: string;
    burn_block_time: string;
    stx_blocks_count: number;
    total_tx_count: number;
  }>;
}

export interface UIStackingCycle {
  cycleId: number;
  stackedStx: number;
  progressPercentage: number;
  blocksTilNextCycle: number;
  approximateDaysTilNextCycle: number;
  approximateStartTimestamp: number;
  approximateEndTimestamp: number;
  rewardCycleLength: number;
  startBurnBlockHeight: number;
  startBurnBlockHash?: string;
  startStacksBlockHeight?: number;
  startStacksBlockHash?: string;
  endBurnBlockHeight: number;
}

export async function fetchRecentBtcBlocks(chain: string, api?: string) {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v2/burn-blocks/?limit=30&offset=0`, {
    cache: 'default',
    next: {
      revalidate: 10, // 10 seconds
      tags: ['btc-blocks'],
    },
  });
  return response.json();
}

export async function fetchRecentStxBlocks(chain: string, api?: string) {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v2/blocks/?limit=${RECENT_STX_BLOCKS_COUNT}&offset=0`,
    {
      cache: 'default',
      next: {
        revalidate: 10, // 10 seconds
        tags: ['stx-blocks'],
      },
    }
  );
  return response.json();
}

export async function fetchStackingCycleData(chain: string, api?: string): Promise<PoxInfo> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/v2/pox`, {
    cache: 'default',
    next: {
      revalidate: 60, // 60 seconds
      tags: ['stacking'],
    },
  });
  return response.json();
}

export async function fetchStacksBlock(
  blockHeightOrHash: string | number,
  chain: string,
  api?: string
): Promise<Block> {
  const apiUrl = getApiUrl(chain, api);
  const fetchUrl = `${apiUrl}/extended/v2/blocks/${blockHeightOrHash}`;
  const response = await stacksAPIFetch(fetchUrl, {
    cache: 'default',
    next: {
      revalidate: 10, // 10 seconds
      tags: ['stacking'],
    },
  });
  return response.json();
}

export async function fetchBurnBlock(
  heightOrHash: string | number,
  chain: string,
  api?: string
): Promise<BurnBlock | null> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v2/burn-blocks/${heightOrHash}`, {
    cache: 'default',
    next: {
      revalidate: 60, // 60 seconds
      tags: ['stacking'],
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // burn block not found for height/hash
      return null;
    }
    throw new Error(`Failed to fetch burn block: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchMempoolStats(chain: string, api?: string) {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx/mempool/stats`, {
    cache: 'default',
    next: {
      revalidate: 10, // 10 seconds
      tags: ['mempool-stats'],
    },
  });
  return response;
}

export async function fetchCurrentStackingCycle(
  chain: string,
  api?: string
): Promise<UIStackingCycle> {
  const poxData = await fetchStackingCycleData(chain, api);

  const {
    current_cycle: { id: cycleId = 0, stacked_ustx = 0 } = ({} = {}),
    next_reward_cycle_in,
    reward_cycle_length,
    current_burnchain_block_height,
  } = poxData || {};

  const stackedStx = stacked_ustx / MICROSTACKS_IN_STACKS;
  const blocksTilNextCycle = next_reward_cycle_in || 0;
  const approximateDaysTilNextCycle = Math.floor(blocksTilNextCycle / NUM_TEN_MINUTES_IN_DAY);
  const progressPercentage = Number(
    (((reward_cycle_length - next_reward_cycle_in) * 100) / reward_cycle_length).toFixed(1)
  );
  const approximateDaysSinceStart = Math.floor(
    (reward_cycle_length - next_reward_cycle_in) / NUM_TEN_MINUTES_IN_DAY
  );

  const approximateStartTimestamp = new Date(
    Date.now() - approximateDaysSinceStart * 24 * 60 * 60 * 1000
  ).getTime();
  const approximateEndTimestamp = new Date(
    Date.now() + approximateDaysTilNextCycle * 24 * 60 * 60 * 1000
  ).getTime();

  const rewardCycleLength = poxData.reward_cycle_length || 0;

  const startBurnBlockHeight =
    current_burnchain_block_height - (reward_cycle_length - next_reward_cycle_in);
  const endBurnBlockHeight = current_burnchain_block_height + next_reward_cycle_in;

  // fetch the burn block in order to get its hash and the first stacks block hash
  const startBurnBlock = await fetchBurnBlock(startBurnBlockHeight, chain, api);
  const startBurnBlockHash = startBurnBlock?.burn_block_hash;
  const firstStacksBlockHashInStartBurnBlock =
    startBurnBlock?.stacks_blocks?.[startBurnBlock.stacks_blocks?.length - 1];

  // fetch the start stacks block only if we have the burn block data
  let startStacksBlockHeight: number | undefined;
  let startStacksBlockHash: string | undefined;

  if (firstStacksBlockHashInStartBurnBlock) {
    const startStacksBlock = await fetchStacksBlock(
      firstStacksBlockHashInStartBurnBlock,
      chain,
      api
    );
    startStacksBlockHeight = startStacksBlock.height;
    startStacksBlockHash = startStacksBlock.hash;
  }

  return {
    cycleId,
    stackedStx,
    progressPercentage,
    blocksTilNextCycle,
    approximateDaysTilNextCycle,
    approximateStartTimestamp,
    approximateEndTimestamp,
    rewardCycleLength,
    startBurnBlockHeight,
    startBurnBlockHash,
    startStacksBlockHeight,
    startStacksBlockHash,
    endBurnBlockHeight,
  };
}

export async function fetchRecentBlocks(chain: string, api?: string): Promise<RecentBlocks> {
  const [btcBlocksData, stxBlocksData] = await Promise.all([
    fetchRecentBtcBlocks(chain, api),
    fetchRecentStxBlocks(chain, api),
  ]);

  const recentBtcBlockData = btcBlocksData.results.slice(0, RECENT_BTC_BLOCKS_COUNT);

  const stxBlocksCountPerBtcBlock = btcBlocksData.results.map((block: BurnBlock) => ({
    burn_block_height: block.burn_block_height,
    burn_block_hash: block.burn_block_hash,
    burn_block_time: block.burn_block_time,
    stx_blocks_count: block.stacks_blocks.length,
    total_tx_count: block.total_tx_count,
  }));

  return {
    btcBlocks: {
      ...btcBlocksData,
      results: recentBtcBlockData.map(
        (block: BurnBlock): UIBtcBlock => ({
          burn_block_height: block.burn_block_height,
          burn_block_time: block.burn_block_time,
          burn_block_hash: block.burn_block_hash,
          stacks_blocks: block.stacks_blocks,
          total_tx_count: block.total_tx_count,
        })
      ),
    },
    stxBlocks: {
      ...stxBlocksData,
      results: stxBlocksData.results.map(
        (block: NakamotoBlock): UIStxBlock => ({
          hash: block.hash,
          height: block.height,
          burn_block_time: block.burn_block_time,
          burn_block_height: block.burn_block_height,
          burn_block_hash: block.burn_block_hash,
          block_time: block.block_time,
          tx_count: block.tx_count,
        })
      ),
    },
    stxBlocksCountPerBtcBlock,
  };
}

export async function fetchRecentTxs(chain: string, api?: string) {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v1/tx/?limit=${TXS_LIST_SIZE}&offset=0`,
    {
      cache: 'default',
      next: {
        revalidate: 10, // 10 seconds
        tags: ['transactions'],
      },
    }
  );
  return response;
}

export async function fetchRecentUITxs(
  chain: string,
  api?: string
): Promise<CompressedTxTableData> {
  const response = await fetchRecentTxs(chain, api);
  const data = await response.json();
  return {
    ...data,
    results: compressTransactions(data.results),
  };
}

export async function fetchUIMempoolStats(chain: string, api?: string): Promise<UIMempoolStats> {
  const response = await fetchMempoolStats(chain, api);
  const mempoolStats = await response.json();
  return {
    tx_type_counts: mempoolStats.tx_type_counts,
  };
}

export async function fetchTxFeeEstimation(
  transactionPayload: string,
  estimatedLen: number | null,
  chain: string,
  api?: string
) {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/v2/fees/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      estimated_len: estimatedLen,
      transaction_payload: transactionPayload,
    }),
    cache: 'default',
    next: {
      revalidate: 10, // 10 seconds
      tags: ['fee-estimation'],
    },
  });
  return response.json();
}
