import { AddressLink } from '@/common/components/ExplorerLinks';
import {
  formatStacksAmount,
  getContractName,
  getFtDecimalAdjustedBalance,
  microToStacksFormatted,
  truncateStxAddress,
} from '@/common/utils/utils';
import { Badge, SimpleTag } from '@/ui/Badge';
import { Text, TextProps } from '@/ui/Text';
import ClarityIcon from '@/ui/icons/ClarityIcon';
import MicroStxIcon from '@/ui/icons/MicroStxIcon';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon } from '@chakra-ui/react';

export const EllipsisText = ({
  children,
  ...textProps
}: { children: React.ReactNode } & TextProps) => {
  return (
    <Text
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      fontSize="sm"
      {...textProps}
    >
      {children}
    </Text>
  );
};

export interface AddressLinkCellRendererProps {
  address: string;
  isContract: boolean;
}

export const AddressLinkCellRenderer = (value: AddressLinkCellRendererProps) => {
  const { address, isContract } = value;
  return address && isContract ? (
    <Badge
      variant="solid"
      content="label"
      _groupHover={{
        bg: 'surfaceTertiary',
      }}
    >
      <Flex gap={1} alignItems="center">
        <Icon h={3} w={3} color="iconPrimary">
          <ClarityIcon />
        </Icon>
        <AddressLink principal={address} variant="tableLink">
          <EllipsisText
            textStyle="text-regular-xs"
            color="textPrimary"
            _hover={{
              color: 'textInteractiveHover',
            }}
            fontFamily="var(--font-matter-mono)"
          >
            {getContractName(address)}
          </EllipsisText>
        </AddressLink>
      </Flex>
    </Badge>
  ) : address && !isContract ? (
    <AddressLink principal={address} variant="tableLink">
      <EllipsisText fontSize="sm">{truncateStxAddress(address)}</EllipsisText>
    </AddressLink>
  ) : (
    <EllipsisText fontSize="sm" color="textTertiary">
      -
    </EllipsisText>
  );
};

export const StringRenderer = (value: string) => {
  if (!value) {
    return (
      <EllipsisText textStyle="text-regular-sm" color="textTertiary">
        -
      </EllipsisText>
    );
  }

  return (
    <EllipsisText textStyle="text-regular-sm" color="textPrimary">
      {value}
    </EllipsisText>
  );
};

export const IndexCellRenderer = ({ index }: { index: number }) => {
  return (
    <SimpleTag
      label={index.toString()}
      _groupHover={{
        bg: 'surfaceTertiary',
      }}
    />
  );
};

export const FeeCellRenderer = (value: string) => {
  const stx = microToStacksFormatted(value);
  const microStx = formatStacksAmount(value);

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
};

export enum AssetType {
  STX = 'stx',
  FUNGIBLE = 'fungible',
  NON_FUNGIBLE = 'non_fungible',
}

export const AmountCellRenderer = ({
  amount,
  assetType,
  assetName,
  decimals,
}: {
  amount: string | number;
  assetType: AssetType | undefined;
  assetName: string | undefined;
  decimals?: number;
}) => {
  if (!amount || !assetType) {
    return (
      <EllipsisText fontSize="sm" color="textTertiary">
        -
      </EllipsisText>
    );
  }

  if (assetType === AssetType.STX) {
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
  if (assetType === AssetType.FUNGIBLE) {
    const adjustedAmount = getFtDecimalAdjustedBalance(amount, decimals || 0);
    return (
      <Flex alignItems="center" gap={1}>
        <EllipsisText fontSize="sm">
          {adjustedAmount} {assetName}
        </EllipsisText>
      </Flex>
    );
  }
  if (assetType === AssetType.NON_FUNGIBLE) {
    return (
      <Flex alignItems="center" gap={1}>
        <EllipsisText fontSize="sm">
          {amount} {assetName}
        </EllipsisText>
      </Flex>
    );
  }

  return <EllipsisText fontSize="sm">-</EllipsisText>;
};
