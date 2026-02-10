import { fetchHolders, fetchRecentTransactions } from '@/api/data-fetchers';
import { getCurrentBtcPrice } from '@/app/getTokenPriceInfo';
import {
  SBTC_ASSET_ID,
  SBTC_DECIMALS,
  sbtcDepositContractAddress,
  sbtcWidthdrawlContractAddress,
} from '@/app/token/[tokenId]/consts';
import { logError } from '@/common/utils/error-utils';
import { getFtDecimalAdjustedBalance } from '@/common/utils/utils';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

import { SBTCData, SBTCTransaction } from './types';

function extractAmount(tx: Transaction): number {
  if (tx.tx_type !== 'contract_call') return 0;
  const amountArg = tx.contract_call?.function_args?.find(a => a.name === 'amount');
  if (!amountArg) return 0;
  const raw = amountArg.repr.replace(/^u/, '');
  return getFtDecimalAdjustedBalance(raw, SBTC_DECIMALS);
}

function extractDepositRecipient(tx: Transaction): string {
  if (tx.tx_type !== 'contract_call') return tx.sender_address;
  const recipientArg = tx.contract_call?.function_args?.find(a => a.name === 'recipient');
  if (!recipientArg) return tx.sender_address;
  return recipientArg.repr.replace(/^'/, '');
}

export async function fetchSBTCData(apiUrl: string): Promise<SBTCData | undefined> {
  try {
    const [holdersResult, btcPriceResult, depositsResult, withdrawalsResult] =
      await Promise.allSettled([
        fetchHolders(apiUrl, SBTC_ASSET_ID, 1, 0),
        getCurrentBtcPrice(),
        fetchRecentTransactions(apiUrl, sbtcDepositContractAddress),
        fetchRecentTransactions(apiUrl, sbtcWidthdrawlContractAddress),
      ]);

    const holders = holdersResult.status === 'fulfilled' ? holdersResult.value : undefined;
    const btcPrice = btcPriceResult.status === 'fulfilled' ? btcPriceResult.value : 0;
    const deposits = depositsResult.status === 'fulfilled' ? depositsResult.value : undefined;
    const withdrawals =
      withdrawalsResult.status === 'fulfilled' ? withdrawalsResult.value : undefined;

    const totalSupply = getFtDecimalAdjustedBalance(holders?.total_supply || '0', SBTC_DECIMALS);
    const totalSupplyUsd = totalSupply * btcPrice;

    const depositTxs: SBTCTransaction[] = (deposits?.results ?? [])
      .filter((tx): tx is Transaction => 'block_height' in tx && tx.tx_status === 'success')
      .map(tx => {
        const amount = extractAmount(tx);
        return {
          txId: tx.tx_id,
          type: 'deposit' as const,
          address: extractDepositRecipient(tx),
          amount,
          amountUsd: amount * btcPrice,
          blockTime: tx.block_time,
        };
      });

    const withdrawalTxs: SBTCTransaction[] = (withdrawals?.results ?? [])
      .filter(
        (tx): tx is Transaction =>
          'block_height' in tx &&
          tx.tx_status === 'success' &&
          tx.tx_type === 'contract_call' &&
          tx.contract_call.function_name === 'initiate-withdrawal-request'
      )
      .map(tx => {
        const amount = extractAmount(tx);
        return {
          txId: tx.tx_id,
          type: 'withdrawal' as const,
          address: tx.sender_address,
          amount,
          amountUsd: amount * btcPrice,
          blockTime: tx.block_time,
        };
      });

    const recentTransactions = [...depositTxs, ...withdrawalTxs]
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, 3);

    return {
      totalSupply,
      totalSupplyUsd,
      btcPrice,
      recentTransactions,
    };
  } catch (error) {
    logError(error as Error, 'fetchSBTCData', { apiUrl }, 'error');
    return undefined;
  }
}
