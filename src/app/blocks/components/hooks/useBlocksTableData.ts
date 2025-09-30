import { useMemo } from 'react';

import { BurnBlock } from '@stacks/stacks-blockchain-api-types';

import { BitcoinBlockTableData } from '../columns/bitcoinBlockColumns';
import {
  BurnBlockGroupHeader,
  StacksBlockTableData,
  StacksTableRow,
} from '../columns/stacksBlockColumns';

export function useBitcoinTableData(
  btcBlocksQuery: any,
  pagination: { pageIndex: number }
): BitcoinBlockTableData[] {
  return useMemo(() => {
    let sourceData: BurnBlock[] = [];

    if (btcBlocksQuery.data) {
      sourceData = Array.isArray(btcBlocksQuery.data.results) ? btcBlocksQuery.data.results : [];
    }

    return sourceData.map((block: BurnBlock) => {
      const stacksBlocksArray = Array.isArray(block.stacks_blocks) ? block.stacks_blocks : [];
      const getInterval = (): string[] => {
        if (stacksBlocksArray.length === 0) return [];
        if (stacksBlocksArray.length === 1) return [stacksBlocksArray[0]];
        return [stacksBlocksArray[0], stacksBlocksArray[stacksBlocksArray.length - 1]];
      };

      return {
        height: block.burn_block_height,
        hash: block.burn_block_hash,
        stacksBlocksInterval: getInterval(),
        stacksBlocks: stacksBlocksArray.length,
        stacksTxs: block.total_tx_count ?? 0,
        totalFees: '0',
        timestamp: block.burn_block_time,
        burn_block_hash: block.burn_block_hash,
      };
    });
  }, [btcBlocksQuery.data, pagination.pageIndex]);
}

export function useStacksTableData(
  stxBlocksQuery: any,
  pagination: { pageIndex: number }
): StacksTableRow[] {
  return useMemo(() => {
    let sourceData: any[] = [];

    if (stxBlocksQuery.data) {
      sourceData = Array.isArray(stxBlocksQuery.data.results) ? stxBlocksQuery.data.results : [];
    }

    const groupedByBurnBlock = sourceData.reduce((groups: Record<string, any[]>, block: any) => {
      const burnBlockKey = `${block.burn_block_height || 0}-${block.burn_block_hash || 'unknown'}`;
      if (!groups[burnBlockKey]) {
        groups[burnBlockKey] = [];
      }
      groups[burnBlockKey].push(block);
      return groups;
    }, {});

    const result: StacksTableRow[] = [];
    Object.entries(groupedByBurnBlock).forEach(([burnBlockKey, blocks]) => {
      if (blocks.length === 0) return;

      const firstBlock = blocks[0];

      result.push({
        type: 'burn-block-header',
        burn_block_height: firstBlock.burn_block_height || 0,
        burn_block_hash: firstBlock.burn_block_hash || '',
        burn_block_time: firstBlock.burn_block_time || 0,
        stacks_blocks_count: blocks.length,
      } as BurnBlockGroupHeader);

      blocks.forEach((block: any) => {
        result.push({
          height: block.height || 0,
          hash: block.hash || '',
          transactions: block.tx_count ?? 0,
          totalFees: (block.execution_cost_read_count ?? 0).toString(),
          timestamp: block.block_time || 0,
        } as StacksBlockTableData);
      });
    });

    return result;
  }, [stxBlocksQuery.data, pagination.pageIndex]);
}
