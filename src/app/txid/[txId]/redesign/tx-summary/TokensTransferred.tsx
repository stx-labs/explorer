import { SBTC_ASSET_ID, SBTC_DECIMALS } from '@/app/token/[tokenId]/consts';
import { AddressLink, TokenLink } from '@/common/components/ExplorerLinks';
import { useFtMetadata } from '@/common/queries/useFtMetadata';
import { ftDecimals, getAssetNameParts, truncateMiddle } from '@/common/utils/utils';
import { Flex, Text } from '@chakra-ui/react';
import { FC } from 'react';

import {
  TransactionEvent,
  TransactionEventFungibleAsset,
  TransactionEventNonFungibleAsset,
  TransactionEventStxAsset,
} from '@stacks/stacks-blockchain-api-types';

interface TokenTransferItemProps {
  event:
    | TransactionEventStxAsset
    | TransactionEventFungibleAsset
    | TransactionEventNonFungibleAsset;
}

export const TokenTransferItem: FC<TokenTransferItemProps> = ({ event }) => {
  const isStx = event.event_type === 'stx_asset';
  const isFt = event.event_type === 'fungible_token_asset';
  const isNft = event.event_type === 'non_fungible_token_asset';

  const ftAssetId = isFt ? event.asset.asset_id : undefined;
  const ftAssetParts = ftAssetId ? getAssetNameParts(ftAssetId) : undefined;
  const ftContractId = ftAssetParts
    ? `${ftAssetParts.address}.${ftAssetParts.contract}`
    : undefined;
  const isSbtc = ftAssetId === SBTC_ASSET_ID;

  const { data: ftMetadata } = useFtMetadata(ftContractId, { enabled: isFt && !isSbtc });

  let contractId = '';
  let symbol = 'STX';
  let amount = '1';

  if (isStx) {
    amount = ftDecimals(event.asset.amount || '0', 6);
  } else if (isFt) {
    contractId = ftContractId!;
    symbol = ftAssetParts!.asset;
    const decimals = isSbtc ? SBTC_DECIMALS : ftMetadata?.decimals;
    amount = ftDecimals(event.asset.amount || '0', decimals ?? 0);
  } else if (isNft) {
    const { asset, address, contract } = getAssetNameParts(event.asset.asset_id);
    contractId = `${address}.${contract}`;
    symbol = asset;
    amount = '1';
  }

  return (
    <Flex gap={1} flexWrap="wrap" alignItems="center">
      {event.asset.sender && (
        <>
          <Text textStyle="text-regular-sm">From:</Text>
          <AddressLink principal={event.asset.sender} variant="tableLink">
            {truncateMiddle(event.asset.sender, 4, 5)}
          </AddressLink>
          <Text textStyle="text-regular-sm">→</Text>
        </>
      )}
      <Text textStyle="text-regular-sm">To:</Text>
      <AddressLink principal={event.asset.recipient || ''} variant="tableLink">
        {truncateMiddle(event.asset.recipient || '', 4, 5)}
      </AddressLink>
      <Text textStyle="text-regular-sm">For:</Text>
      <Text textStyle="text-regular-sm" fontWeight="medium">
        {amount}
      </Text>
      {isStx ? (
        <Text textStyle="text-regular-sm">{symbol}</Text>
      ) : (
        <TokenLink tokenId={contractId} variant="tableLink">
          {symbol}
        </TokenLink>
      )}
    </Flex>
  );
};

interface TokensTransferredProps {
  events: TransactionEvent[];
}

export const TokensTransferred: FC<TokensTransferredProps> = ({ events }) => {
  const transferEvents = events.filter(
    (
      event
    ): event is
      | TransactionEventStxAsset
      | TransactionEventFungibleAsset
      | TransactionEventNonFungibleAsset => {
      const isStx = event.event_type === 'stx_asset';
      const isFt = event.event_type === 'fungible_token_asset';
      const isNft = event.event_type === 'non_fungible_token_asset';

      return (isStx || isFt || isNft) && event.asset.asset_event_type === 'transfer';
    }
  );

  if (transferEvents.length === 0) {
    return (
      <Text textStyle="text-regular-sm" color="textSecondary">
        -
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={2}>
      {transferEvents.map((event, index) => (
        <TokenTransferItem key={`${event.event_index}-${index}`} event={event} />
      ))}
    </Flex>
  );
};
