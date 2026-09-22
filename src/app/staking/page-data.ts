import { fetchTx } from '@/api/data-fetchers';
import { getApiUrl } from '@/common/utils/network-utils';

import { fetchBond } from './data';

export async function fetchFeaturedBond(index: number, chain: string, api?: string) {
  const bond = await fetchBond(index, chain, api);
  if (!bond.transaction) return bond;

  // The bond endpoint can report the current burn height alongside the setup timestamp.
  // Read both from the confirmed setup transaction so the lifecycle stays chronological.
  const tx = await fetchTx(getApiUrl(chain, api), bond.transaction.tx_id);
  if (!('burn_block_height' in tx) || !tx.canonical || tx.burn_block_height <= 0) {
    throw new Error('Bond setup transaction is not confirmed');
  }
  return {
    ...bond,
    transaction: {
      ...bond.transaction,
      bitcoin_block: { height: tx.burn_block_height, time: tx.burn_block_time },
    },
  };
}
