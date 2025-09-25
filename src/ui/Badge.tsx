'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import {
  getTxStatusBgColor,
  getTxStatusIcon,
  getTxStatusIconColor,
  getTxStatusLabel,
  getTxTypeColor,
  getTxTypeIcon,
  getTxTypeLabel,
} from '@/common/utils/transactions';
import { NextLink } from '@/ui/NextLink';
import { Text, TextProps } from '@/ui/Text';
import {
  Badge as CUIBadge,
  BadgeProps as CUIBadgeProps,
  Flex,
  FlexProps,
  Icon,
  IconProps,
  RecipeVariantProps,
  chakra,
} from '@chakra-ui/react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { forwardRef } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import BitcoinCircleIcon from './icons/BitcoinCircleIcon';
import StacksIconBlock from './icons/StacksIconBlock';
import { badgeRecipe } from './theme/recipes/BadgeRecipe';

type BadgeVariantProps = RecipeVariantProps<typeof badgeRecipe>;
export type BadgeProps = CUIBadgeProps & BadgeVariantProps;

export const BadgeBase = forwardRef<HTMLDivElement, BadgeProps>(
  ({ children, variant, content, ...rest }, ref) => {
    return (
      <CUIBadge ref={ref} variant={variant} content={content} {...rest}>
        {children}
      </CUIBadge>
    );
  }
);

export const Badge = chakra(BadgeBase, badgeRecipe);

export const BlockHeightBadge = forwardRef<
  HTMLDivElement,
  BadgeProps & { blockType: 'stx' | 'btc'; blockHeight: number; disableLink?: boolean }
>(({ children, blockType, blockHeight, disableLink = false, ...rest }, ref) => {
  const network = useGlobalContext().activeNetwork;

  const text = (
    <Text textStyle="text-mono-sm" color="textPrimary" textDecoration="none">
      #{blockHeight}
    </Text>
  );

  return (
    <Badge ref={ref} {...rest} variant="solid" type="blockHeight">
      <Flex alignItems="center" gap={1}>
        <DefaultBadgeIcon
          icon={blockType === 'stx' ? <StacksIconBlock /> : <BitcoinCircleIcon />}
          color={blockType === 'stx' ? 'accent.stacks-500' : 'accent.bitcoin-500'}
        />
        {disableLink ? (
          text
        ) : (
          <NextLink
            href={buildUrl(
              `${blockType === 'stx' ? '/block/' : '/btcblock/'}${blockHeight}`,
              network
            )}
            variant="tableLink"
          >
            {text}
          </NextLink>
        )}
      </Flex>
    </Badge>
  );
});

export const TransactionTypeBadge = forwardRef<
  HTMLDivElement,
  BadgeProps & { tx: Transaction | MempoolTransaction; withoutLabel?: boolean }
>(({ children, tx, withoutLabel, ...rest }, ref) => {
  return (
    <Badge
      ref={ref}
      variant="outline"
      content={withoutLabel ? 'iconOnly' : 'iconAndLabel'}
      type="transactionType"
      {...rest}
    >
      <Flex alignItems="center" gap={1.5}>
        <DefaultBadgeIcon icon={getTxTypeIcon(tx.tx_type)} bg={getTxTypeColor(tx.tx_type)} />
        {withoutLabel ? null : <DefaultBadgeLabel label={getTxTypeLabel(tx.tx_type)} />}
      </Flex>
    </Badge>
  );
});

export const TransactionStatusBadge = forwardRef<
  HTMLDivElement,
  BadgeProps & { tx: Transaction | MempoolTransaction; withoutLabel?: boolean }
>(({ children, tx, withoutLabel, ...rest }, ref) => {
  return (
    <Badge
      ref={ref}
      bg={getTxStatusBgColor(tx)}
      type="transactionStatus"
      content={withoutLabel ? 'iconOnly' : 'iconAndLabel'}
      {...rest}
    >
      <Flex alignItems="center" gap={1}>
        <DefaultBadgeIcon icon={getTxStatusIcon(tx, true)} color={getTxStatusIconColor(tx)} />
        {withoutLabel ? null : <DefaultBadgeLabel label={getTxStatusLabel(tx)} />}
      </Flex>
    </Badge>
  );
});

export const StatusBadge = forwardRef<
  HTMLDivElement,
  BadgeProps & { successLabel: string; failureLabel: string; success: boolean }
>(({ successLabel, failureLabel, success, ...rest }, ref) => {
  return (
    <DefaultBadge
      icon={
        <DefaultBadgeIcon
          size={3.5}
          icon={success ? <CheckCircle weight="bold" /> : <XCircle weight="bold" />}
          color={success ? 'feedback.green-500' : 'iconError'}
        />
      }
      label={
        success ? (
          <DefaultBadgeLabel label={successLabel} />
        ) : (
          <DefaultBadgeLabel label={failureLabel} />
        )
      }
      textStyle="text-medium-sm"
      bg={success ? 'transactionStatus.confirmed' : 'transactionStatus.failed'}
      border="none"
      px={1.5}
      py={1}
      {...rest}
    />
  );
});

export const DefaultBadgeIcon = ({
  icon,
  color = 'var(--stacks-colors-neutral-sand-1000)',
  bg,
  size,
}: {
  icon: React.ReactNode;
  color?: string;
  bg?: string;
  size?: number;
}) => {
  const iconSize = size ?? (bg ? 3 : 3.5);

  return bg ? (
    <Flex
      h={4.5}
      w={4.5}
      p={0.5}
      alignItems="center"
      justifyContent="center"
      bg={bg}
      borderRadius="redesign.sm"
    >
      <Icon h={iconSize} w={iconSize} color={color}>
        {icon}
      </Icon>
    </Flex>
  ) : (
    <Icon h={iconSize} w={iconSize} color={color}>
      {icon}
    </Icon>
  );
};

export const DefaultBadgeLabel = ({ label, ...rest }: { label: string } & TextProps) => {
  return (
    <Text textStyle="text-medium-xs" color={'textPrimary'} whiteSpace="nowrap" {...rest}>
      {label}
    </Text>
  );
};

export const DefaultBadge = forwardRef<
  HTMLDivElement,
  BadgeProps & {
    icon?: React.ReactElement<typeof DefaultBadgeIcon>;
    label?: React.ReactElement<typeof DefaultBadgeLabel>;
  }
>(({ children, icon, label, ...rest }, ref) => {
  return (
    <Badge
      ref={ref}
      variant="outline"
      content={label ? 'iconAndLabel' : 'iconOnly'}
      w="fit-content"
      {...rest}
    >
      <Flex alignItems="center" gap={1} w="fit-content">
        {icon}
        {label}
      </Flex>
    </Badge>
  );
});

export const SimpleTag = forwardRef<
  HTMLDivElement,
  BadgeProps & {
    icon?: React.ReactElement;
    label?: React.ReactNode;
    iconProps?: IconProps;
    labelProps?: TextProps;
    containerProps?: FlexProps;
    children?: React.ReactNode;
  }
>(({ icon, label, iconProps, labelProps, containerProps, children, ...rest }, ref) => {
  return (
    <Badge ref={ref} variant="solid" type="tag" {...rest}>
      <Flex alignItems="center" gap={1} w="fit-content" {...containerProps}>
        {icon && (
          <Icon h={3} w={3} {...iconProps}>
            {icon}
          </Icon>
        )}
        {label && (
          <Text textStyle="text-mono-xs" color="textPrimary" {...labelProps}>
            {label}
          </Text>
        )}
      </Flex>
    </Badge>
  );
});
