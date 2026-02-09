import {
  AmountCellRenderer,
  AssetType,
  EllipsisText,
} from '@/common/components/table/CommonTableCellRenderers';
import { useFtMetadata } from '@/common/queries/useFtMetadata';
import {
  formatStacksAmount,
  getAssetNameParts,
  getFtDecimalAdjustedBalance,
  microToStacksFormatted,
} from '@/common/utils/utils';
import { DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Tooltip } from '@/ui/Tooltip';
import MicroStxIcon from '@/ui/icons/MicroStxIcon';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon } from '@chakra-ui/react';

import { TransactionEvent } from '@stacks/stacks-blockchain-api-types';

import {
  ExtendedTransactionEventAssetType,
  getAmount,
  getAssetEventTypeIcon,
  getAssetEventTypeLabel,
} from './utils';

export const AssetEventTypeCellRenderer = ({
  assetEventType,
}: {
  assetEventType: ExtendedTransactionEventAssetType;
}) => {
  return (
    <DefaultBadge
      icon={
        <DefaultBadgeIcon
          icon={getAssetEventTypeIcon(assetEventType)}
          bg="surfaceFifth"
          color="iconPrimary"
        />
      }
      label={<DefaultBadgeLabel label={getAssetEventTypeLabel(assetEventType)} />}
    />
  );
};

export function useEventAmountCellData(event: TransactionEvent) {
  const eventType = event.event_type;
  const assetId = eventType === 'fungible_token_asset' ? event.asset.asset_id : undefined;
  const { address, contract, asset } = assetId ? getAssetNameParts(assetId) : {};
  const contractId = `${address}.${contract}`;
  const shouldFetchMetadata = eventType === 'fungible_token_asset' && !!contractId;
  const ftMetadata = useFtMetadata(contractId, {
    enabled: shouldFetchMetadata,
  });
  const ftDecimals = ftMetadata.data?.decimals;
  const amount = getAmount(event);

  return {
    amount,
    assetType: getAssetTypeFromEventType(eventType),
    assetName: asset,
    decimals: ftDecimals,
  };
}

export function getAssetTypeFromEventType(eventType: TransactionEvent['event_type']) {
  switch (eventType) {
    case 'stx_asset':
      return AssetType.STX;
    case 'fungible_token_asset':
      return AssetType.FUNGIBLE;
    case 'non_fungible_token_asset':
      return AssetType.NON_FUNGIBLE;
    default:
      return undefined;
  }
}

export const EventAmountCellRenderer = (event: TransactionEvent) => {
  const { amount, assetType, assetName, decimals } = useEventAmountCellData(event);

  return (
    <AmountCellRenderer
      amount={amount}
      assetType={assetType}
      assetName={assetName}
      decimals={decimals}
    />
  );
};

export const TimeStampCellRenderer = (value: string, tooltip?: string) => {
  const content = (
    <Flex
      alignItems="center"
      bg="surfacePrimary"
      borderRadius="md"
      py={0.5}
      px={1}
      w="fit-content"
      _groupHover={{
        bg: 'surfaceTertiary',
      }}
    >
      <EllipsisText
        fontSize="xs"
        fontFamily="var(--font-matter-mono)"
        suppressHydrationWarning={true}
      >
        {value}
      </EllipsisText>
    </Flex>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{content}</Tooltip>;
  }

  return content;
};
