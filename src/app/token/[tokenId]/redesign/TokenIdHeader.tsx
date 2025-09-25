import { TokenImage } from '@/common/components/table/fungible-tokens-table/FungibleTokensTableCellRenderers';
import { useIsInViewport } from '@/common/hooks/useIsInViewport';
import {
  truncateStxAddress,
  truncateStxContractId,
  validateStacksContractId,
} from '@/common/utils/utils';
import { DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Text, TextProps } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import StacksIconBlock from '@/ui/icons/StacksIconBlock';
import { Box, Flex, Stack, useClipboard } from '@chakra-ui/react';
import { Coin } from '@phosphor-icons/react';
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

const TokenNameBadgeUnminimized = ({ name }: { name: string }) => {
  return name ? (
    <Text textStyle="heading-sm" color="textPrimary">
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

const TokenIdBadgeMinimized = ({ tokenId }: { tokenId: string }) => {
  const isContract = validateStacksContractId(tokenId);
  return tokenId ? (
    <Badge
      copyValue={tokenId}
      value={isContract ? truncateStxContractId(tokenId) : truncateStxAddress(tokenId)}
      copiedText={`Address copied to clipboard`}
      textProps={{ textStyle: 'text-medium-sm' }}
    />
  ) : null;
};

const TokenIdLabelBadgeUnminimized = () => {
  return (
    <DefaultBadge
      icon={<DefaultBadgeIcon icon={<Coin />} color="iconInvert" size={3} bg="iconPrimary" />}
      label={<DefaultBadgeLabel label={'Token'} />}
    />
  );
};

const TokenIdLabelBadgeMinimized = () => {
  return (
    <DefaultBadge icon={<DefaultBadgeIcon icon={<StacksIconBlock color="black" />} size={4.5} />} />
  );
};

export const TokenIdHeaderUnminimized = forwardRef<
  HTMLDivElement,
  { name: string; symbol: string; imageUrl: string }
>(({ name, symbol, imageUrl }, ref) => {
  return (
    <Flex
      bg={`linear-gradient(to bottom, var(--stacks-colors-redesign-border-primary), var(--stacks-colors-redesign-border-secondary))`}
      padding={`${BORDER_WIDTH}px`}
      borderRadius={`calc(var(--stacks-radii-redesign-xl) + ${BORDER_WIDTH}px)`}
      boxShadow="elevation2"
      ref={ref}
    >
      <Stack p={4} gap={3} w="full" borderRadius="redesign.xl" bg="surfaceSecondary">
        <TokenIdLabelBadgeUnminimized />
        <Flex gap={2} flexWrap="wrap" alignItems="center">
          <TokenImage url={imageUrl} alt={name} />
          <TokenNameBadgeUnminimized name={name} />
          <TokenSymbolBadgeUnminimized symbol={symbol} />
        </Flex>
      </Stack>
    </Flex>
  );
});

export const TokenIdHeaderMinimized = ({ tokenId }: { tokenId: string }) => {
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
          <TokenIdLabelBadgeMinimized />
          <TokenIdBadgeMinimized tokenId={tokenId} />
        </Flex>
      </Flex>
    </Flex>
  );
};

export const TokenIdHeader = () => {
  const { tokenId, tokenData } = useTokenIdPageData();
  const { name, symbol, imageUri } = tokenData || {};
  const txHeaderRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useIsInViewport(txHeaderRef);

  return (
    <>
      <TokenIdHeaderUnminimized
        name={name || ''}
        symbol={symbol || ''}
        imageUrl={imageUri || ''}
        ref={txHeaderRef}
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
          <TokenIdHeaderMinimized tokenId={tokenId} />
        </Box>
      </motion.div>
    </>
  );
};
