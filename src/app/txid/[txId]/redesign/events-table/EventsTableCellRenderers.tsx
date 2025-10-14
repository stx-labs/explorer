import { EllipsisText } from '@/common/components/table/CommonTableCellRenderers';
import { DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Tooltip } from '@/ui/Tooltip';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon } from '@chakra-ui/react';

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

export const AmountCellRenderer = (value: number) => {
  return (
    <Flex alignItems="center" gap={1}>
      <Icon h={3} w={3} color="textSecondary">
        <StacksIconThin />
      </Icon>
      <EllipsisText fontSize="sm">{value} STX</EllipsisText>
    </Flex>
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
