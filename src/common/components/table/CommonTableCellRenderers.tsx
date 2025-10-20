import { AddressLink } from '@/common/components/ExplorerLinks';
import { getContractName, truncateStxAddress } from '@/common/utils/utils';
import { Badge } from '@/ui/Badge';
import { Text, TextProps } from '@/ui/Text';
import ClarityIcon from '@/ui/icons/ClarityIcon';
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
