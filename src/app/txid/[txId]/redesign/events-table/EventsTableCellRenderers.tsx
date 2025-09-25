import { EllipsisText } from '@/common/components/table/CommonTableCellRenderers';
import {
  formatStacksAmount,
  getAssetNameParts,
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

export const AmountCellRenderer = ({
  amount,
  event,
}: {
  amount: string;
  event: TransactionEvent;
}) => {
  if (!amount) {
    return (
      <EllipsisText fontSize="sm" color="textTertiary">
        -
      </EllipsisText>
    );
  }

  if (event.event_type === 'stx_asset') {
    const stx = microToStacksFormatted(amount);
    const microStx = formatStacksAmount(amount);
    return (
      <Flex alignItems="center" gap={1}>
        <Icon h={3} w={3} color="textSecondary">
          {stx.length > microStx.length ? <MicroStxIcon /> : <StacksIconThin />}
        </Icon>
        <EllipsisText fontSize="sm">
          {stx.length > microStx.length ? `${microStx} µSTX` : `${stx} STX`}
        </EllipsisText>
      </Flex>
    );
  }
  if (event.event_type === 'fungible_token_asset') {
    const { asset } = getAssetNameParts(event.asset.asset_id);
    return (
      <Flex alignItems="center" gap={1}>
        <EllipsisText fontSize="sm">
          {amount} {asset}
        </EllipsisText>
      </Flex>
    );
  }
  if (event.event_type === 'non_fungible_token_asset') {
    const { asset } = getAssetNameParts(event.asset.asset_id);
    return (
      <Flex alignItems="center" gap={1}>
        <EllipsisText fontSize="sm">
          {amount} {asset}
        </EllipsisText>
      </Flex>
    );
  }

  return <EllipsisText fontSize="sm">-</EllipsisText>;
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
