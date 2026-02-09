import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { useBlockByHash } from '../../../common/queries/useBlockByHeightOrHash';

export function useTxBlock(tx: Transaction | MempoolTransaction) {
  const hash = 'block_hash' in tx && tx.block_hash !== '0x' ? tx.block_hash : undefined;
  return useBlockByHash(hash);
}
