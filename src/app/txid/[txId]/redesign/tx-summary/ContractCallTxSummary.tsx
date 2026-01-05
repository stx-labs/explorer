import { AddressLink, BlockLink } from '@/common/components/ExplorerLinks';
import { formatBlockTime } from '@/common/utils/time-utils';
import { isConfirmedTx } from '@/common/utils/transaction-utils';
import { Badge, BlockHeightBadge, DefaultBadgeLabel } from '@/ui/Badge';
import { Flex } from '@chakra-ui/react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { useTxIdPageData } from '../../TxIdPageContext';
import { PriceSummaryItemValue, SponsorTag, SummaryItem } from './SummaryItem';
import { TokensTransferred } from './TokensTransferred';

export const ContractCallTxSummaryItems = ({
  tx,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
}) => {
  const { stxPrice } = useTxIdPageData();
  const isSponsored = tx.sponsored;
  const sponsor = tx.sponsor_address;

  const isConfirmed = isConfirmedTx<ContractCallTransaction, MempoolContractCallTransaction>(tx);
  const txHasAllEvents = isConfirmed && tx.event_count <= 100;
  const showTransfers =
    txHasAllEvents &&
    tx.events?.some(
      event =>
        ((event.event_type === 'fungible_token_asset' ||
          event.event_type === 'non_fungible_token_asset') &&
          event.asset.asset_event_type === 'transfer') ||
        (event.event_type === 'stx_asset' && event.asset.asset_event_type === 'transfer')
    );

  return (
    <>
      <SummaryItem
        label="ID"
        value={tx.tx_id}
        valueRenderer={value => (
          <AddressLink principal={value} wordBreak="break-all" variant="tableLink">
            {value}
          </AddressLink>
        )}
        showCopyButton
      />
      <SummaryItem
        label="By"
        value={tx.sender_address}
        valueRenderer={value => (
          <AddressLink principal={value} wordBreak="break-all" variant="tableLink">
            {value}
          </AddressLink>
        )}
        showCopyButton
      />
      <SummaryItem
        label="Interacted with (To)"
        value={tx.contract_call?.contract_id}
        valueRenderer={value => (
          <AddressLink principal={value} wordBreak="break-all" variant="tableLink">
            {value}
          </AddressLink>
        )}
        showCopyButton
      />
      {showTransfers && (
        <SummaryItem
          label="Tokens Transferred"
          value=""
          valueRenderer={() => <TokensTransferred events={isConfirmed ? tx.events || [] : []} />}
        />
      )}
      {isConfirmed && tx.block_time && (
        <SummaryItem
          label="Timestamp"
          value={formatBlockTime(tx.block_time)}
          valueRenderer={value => (
            <Badge
              variant="solid"
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
        valueRenderer={value => (
          <Flex gap={2} alignItems="center">
            <PriceSummaryItemValue value={value} stxPrice={stxPrice} />
            <SponsorTag isSponsored={isSponsored} sponsor={sponsor} />
          </Flex>
        )}
      />
      <SummaryItem label="Nonce" value={tx.nonce?.toString() || ''} showCopyButton />
      {isConfirmed && (
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
      {isConfirmed && tx.block_hash && (
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
      {isConfirmed && tx.burn_block_height && (
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
};
