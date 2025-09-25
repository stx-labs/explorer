import { AddressLink, BlockLink } from '@/common/components/ExplorerLinks';
import { formatBlockTime } from '@/common/utils/time-utils';
import { isConfirmedTx } from '@/common/utils/transaction-utils';
import { capitalize } from '@/common/utils/utils';
import { Badge, BlockHeightBadge, DefaultBadgeLabel } from '@/ui/Badge';

import {
  MempoolTenureChangeTransaction,
  TenureChangeTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { useTxIdPageData } from '../../TxIdPageContext';
import { PriceSummaryItemValue, SummaryItem } from './SummaryItem';

export const TenureChangeTxSummaryItems = ({
  tx,
}: {
  tx: TenureChangeTransaction | MempoolTenureChangeTransaction;
}) => {
  const { stxPrice } = useTxIdPageData();
  return (
    <>
      <SummaryItem label="ID" value={tx.tx_id} showCopyButton />
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
      {isConfirmedTx<TenureChangeTransaction, MempoolTenureChangeTransaction>(tx) && (
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
      <SummaryItem label="Nonce" value={tx.nonce?.toString() || ''} showCopyButton />
      <SummaryItem
        label="Cause"
        value={capitalize(tx.tenure_change_payload?.cause.replace('_', ' ') || '')}
      />
      {isConfirmedTx<TenureChangeTransaction, MempoolTenureChangeTransaction>(tx) && (
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
      {isConfirmedTx<TenureChangeTransaction, MempoolTenureChangeTransaction>(tx) && (
        <SummaryItem
          label="Block hash"
          value={tx.block_hash?.toString() || ''}
          showCopyButton
          valueRenderer={value => (
            <BlockLink hash={value} wordBreak="break-all" variant="tableLink">
              {value}
            </BlockLink>
          )}
        />
      )}
      {isConfirmedTx<TenureChangeTransaction, MempoolTenureChangeTransaction>(tx) && (
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
      <SummaryItem
        label="Tenure consensus hash"
        value={tx.tenure_change_payload?.tenure_consensus_hash || ''}
        showCopyButton
      />
      <SummaryItem
        label="Burn view consensus hash"
        value={tx.tenure_change_payload?.burn_view_consensus_hash || ''}
        showCopyButton
      />
      <SummaryItem
        label="Previous tenure end"
        value={tx.tenure_change_payload?.previous_tenure_end || ''}
        showCopyButton
      />
      <SummaryItem
        label="Previous tenure blocks"
        value={tx.tenure_change_payload?.previous_tenure_blocks?.toString() || ''}
        showCopyButton
      />
      <SummaryItem
        label="Pubkey hash"
        value={tx.tenure_change_payload?.pubkey_hash || ''}
        showCopyButton
      />
    </>
  );
};
