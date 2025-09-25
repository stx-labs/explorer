import { AddressLink } from '@/common/components/ExplorerLinks';
import { formatBlockTime } from '@/common/utils/time-utils';
import { getAmount, getToAddress, isConfirmedTx } from '@/common/utils/transaction-utils';
import { Badge, BlockHeightBadge, DefaultBadgeLabel } from '@/ui/Badge';

import {
  MempoolTokenTransferTransaction,
  TokenTransferTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { useTxIdPageData } from '../../TxIdPageContext';
import { PriceSummaryItemValue, SummaryItem } from './SummaryItem';

export function TokenTransferTxSummaryItems({
  tx,
}: {
  tx: TokenTransferTransaction | MempoolTokenTransferTransaction;
}) {
  const { stxPrice } = useTxIdPageData();
  return (
    <>
      <SummaryItem label="ID" value={tx.tx_id} showCopyButton />
      {isConfirmedTx<TokenTransferTransaction, MempoolTokenTransferTransaction>(tx) && (
        <SummaryItem
          label="Amount"
          value={getAmount(tx).toString()}
          valueRenderer={value => <PriceSummaryItemValue value={value} stxPrice={stxPrice} />}
        />
      )}
      <SummaryItem
        label="From"
        value={tx.sender_address}
        valueRenderer={value => (
          <AddressLink principal={value} wordBreak="break-all" variant="tableLink">
            {value}
          </AddressLink>
        )}
        showCopyButton
      />
      <SummaryItem
        label="To"
        value={getToAddress(tx)}
        valueRenderer={value => (
          <AddressLink principal={value} wordBreak="break-all" variant="tableLink">
            {value}
          </AddressLink>
        )}
        showCopyButton
      />
      {isConfirmedTx<TokenTransferTransaction, MempoolTokenTransferTransaction>(tx) && (
        <SummaryItem
          label="Timestamp"
          value={formatBlockTime(tx.block_time)}
          valueRenderer={value => (
            <Badge
              variant="solid"
              type="tag"
              _groupHover={{
                bg: 'surfaceTertiary',
              }}
            >
              <DefaultBadgeLabel label={value} fontFamily="matterMono" />
            </Badge>
          )}
          showCopyButton
        />
      )}
      <SummaryItem
        label="Fee"
        value={tx.fee_rate}
        valueRenderer={value => <PriceSummaryItemValue value={value} stxPrice={stxPrice} />}
      />
      <SummaryItem label="Memo" value={tx.token_transfer.memo} showCopyButton />
      <SummaryItem label="Nonce" value={tx.nonce?.toString() || ''} showCopyButton />
      {isConfirmedTx<TokenTransferTransaction, MempoolTokenTransferTransaction>(tx) && (
        <SummaryItem
          label="Block height"
          value={tx.block_height?.toString() || ''}
          showCopyButton
          valueRenderer={value => (
            <BlockHeightBadge
              blockType="stx"
              blockHeight={Number(value)}
              _groupHover={{
                bg: 'surfaceTertiary',
              }}
            />
          )}
        />
      )}
      {isConfirmedTx<TokenTransferTransaction, MempoolTokenTransferTransaction>(tx) && (
        <SummaryItem
          label="Bitcoin Anchor"
          value={tx.burn_block_height?.toString() || ''}
          showCopyButton
          valueRenderer={value => (
            <BlockHeightBadge
              blockType="btc"
              blockHeight={Number(value)}
              _groupHover={{
                bg: 'surfaceTertiary',
              }}
            />
          )}
        />
      )}
    </>
  );
}
