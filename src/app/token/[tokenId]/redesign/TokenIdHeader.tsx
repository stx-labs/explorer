'use client';

import { showRiskyTokenAlert, showSBTCTokenAlert } from '@/app/tokens/utils';
import { TokenImage } from '@/common/components/table/fungible-tokens-table/FungibleTokensTableCellRenderers';
import { useIsInViewport } from '@/common/hooks/useIsInViewport';
import { getAssetNameParts } from '@/common/utils/utils';
import { DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Text, TextProps } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Icon, Stack, useClipboard } from '@chakra-ui/react';
import { Coin, Warning } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { forwardRef, useRef } from 'react';

import { useTokenIdPageData } from './context/TokenIdPageContext';

const BORDER_WIDTH = 1;

// TODO: move to shared component
const Badge = ({
  value,
  copyValue,
  copiedText,
  textProps,
}: {
  value: string;
  copyValue: string;
  copiedText: string;
  textProps?: TextProps;
}) => {
  const { copied, copy } = useClipboard({
    value: copyValue,
    timeout: 750,
  });

  return (
    <Tooltip content={copiedText || 'Copied!'} open={copied} variant="redesignPrimary">
      <Flex
        px={3}
        py={1.5}
        bg="surfacePrimary"
        _hover={{
          bg: 'surfaceFifth',
        }}
        borderRadius="redesign.md"
        alignItems="center"
        cursor="pointer"
        onClick={() => copy()}
      >
        <Text color="textPrimary" whiteSpace="nowrap" {...textProps}>
          {value}
        </Text>
      </Flex>
    </Tooltip>
  );
};

const TokenNameUnminimized = ({ name }: { name: string }) => {
  return name ? (
    <Text textStyle="heading-sm" color="textPrimary">
      {name}
    </Text>
  ) : null;
};

const TokenNameMinimized = ({ name }: { name: string }) => {
  return name ? (
    <Text textStyle="text-medium-md" color="textPrimary">
      {name}
    </Text>
  ) : null;
};

const TokenSymbolBadgeUnminimized = ({ symbol }: { symbol: string }) => {
  return symbol ? (
    <Badge
      copyValue={symbol}
      value={symbol}
      copiedText={`Token symbol copied to clipboard`}
      textProps={{ textStyle: 'text-medium-md' }}
    />
  ) : null;
};

const TokenSymbolBadgeMinimized = ({ symbol }: { symbol: string }) => {
  return symbol ? (
    <Badge
      copyValue={symbol}
      value={symbol}
      copiedText={`Token symbol copied to clipboard`}
      textProps={{ textStyle: 'text-medium-sm' }}
    />
  ) : null;
};

const TokenBadgeUnminimized = () => {
  return (
    <DefaultBadge
      icon={<DefaultBadgeIcon icon={<Coin />} color="iconInvert" size={3} bg="iconPrimary" />}
      label={<DefaultBadgeLabel label={'Token'} />}
    />
  );
};

const TokenBadgeMinimized = () => {
  return (
    <DefaultBadge
      icon={<DefaultBadgeIcon icon={<Coin />} color="iconInvert" size={3} bg="iconPrimary" />}
      p={1}
    />
  );
};

const WarningIcon = ({
  tokenName,
  tokenSymbol,
  contractId,
}: {
  tokenName: string;
  tokenSymbol: string;
  contractId: string;
}) => {
  const icon = (
    <Icon h={4.5} w={4.5} color="iconError">
      <Warning weight="fill" />
    </Icon>
  );

  if (showSBTCTokenAlert(tokenName, tokenSymbol, contractId)) {
    return icon;
  }

  if (showRiskyTokenAlert(contractId)) {
    return icon;
  }

  return null;
};

export const TokenIdHeaderUnminimized = forwardRef<
  HTMLDivElement,
  { name: string; symbol: string; imageUrl: string; contractId: string }
>(({ name, symbol, imageUrl, contractId }, ref) => {
  return (
    <Flex
      bg={`linear-gradient(to bottom, var(--stacks-colors-redesign-border-primary), var(--stacks-colors-redesign-border-secondary))`}
      padding={`${BORDER_WIDTH}px`}
      borderRadius={`calc(var(--stacks-radii-redesign-xl) + ${BORDER_WIDTH}px)`}
      boxShadow="elevation2"
      ref={ref}
    >
      <Stack p={4} gap={3} w="full" borderRadius="redesign.xl" bg="surfaceSecondary">
        <TokenBadgeUnminimized />
        <Flex gap={2} flexWrap="wrap" alignItems="center">
          <TokenImage url={imageUrl} alt={name} height={40} width={40} borderRadius="50%" />
          <TokenNameUnminimized name={name} />
          <TokenSymbolBadgeUnminimized symbol={symbol} />
          <WarningIcon tokenName={name} tokenSymbol={symbol} contractId={contractId} />
        </Flex>
      </Stack>
    </Flex>
  );
});

export const TokenIdHeaderMinimized = ({
  name,
  symbol,
  imageUrl,
  contractId,
}: {
  name: string;
  symbol: string;
  imageUrl: string;
  contractId: string;
}) => {
  return (
    <Flex
      bg={`linear-gradient(to bottom, var(--stacks-colors-redesign-border-primary), var(--stacks-colors-redesign-border-secondary))`}
      padding={`${BORDER_WIDTH}px`}
      borderRadius={`calc(var(--stacks-radii-redesign-xl) + ${BORDER_WIDTH}px)`}
      boxShadow="elevation2"
    >
      <Flex
        p={2}
        gap={3}
        w="full"
        borderRadius="redesign.xl"
        bg="surfaceSecondary"
        alignItems="center"
      >
        <Flex gap={1} alignItems="center">
          <TokenBadgeMinimized />
          <Flex gap={2} alignItems="center">
            <TokenImage url={imageUrl} alt={name} height={24} width={24} borderRadius="50%" />
            <TokenNameMinimized name={name} />
            <TokenSymbolBadgeMinimized symbol={symbol} />
            <WarningIcon tokenName={name} tokenSymbol={symbol} contractId={contractId} />
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export const TokenIdHeader = () => {
  const { tokenId, tokenData } = useTokenIdPageData();
  const { name, symbol, imageUri } = tokenData || {};
  const { address, contract } = getAssetNameParts(tokenId || '');
  const contractId = `${address}.${contract}`;
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useIsInViewport(headerRef);

  return (
    <>
      <TokenIdHeaderUnminimized
        name={name || ''}
        symbol={symbol || ''}
        imageUrl={imageUri || ''}
        ref={headerRef}
        contractId={contractId}
      />
      <motion.div // TODO: move to shared component
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: isHeaderInView ? 0 : 1,
          y: isHeaderInView ? -20 : 0,
          pointerEvents: isHeaderInView ? 'none' : 'auto',
        }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 'var(--stacks-z-index-docked)',
        }}
      >
        <Box borderRadius="redesign.xl" pt={3} px={6} bg="transparent">
          <TokenIdHeaderMinimized
            name={name || ''}
            symbol={symbol || ''}
            imageUrl={imageUri || ''}
            contractId={contractId}
          />
        </Box>
      </motion.div>
    </>
  );
};
