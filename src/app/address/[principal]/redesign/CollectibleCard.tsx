'use client';

import { AddressLink } from '@/common/components/ExplorerLinks';
import { useNftMetadata } from '@/common/queries/useNftMetadata';
import { deriveTokenTickerFromAssetId } from '@/common/utils/fungible-token-utils';
import { getAssetNameParts } from '@/common/utils/utils';
import { Link } from '@/ui/Link';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { useImageContentType } from '../TokenBalanceCard/useImageUrl';
import { DefaultTokenImage, TokenImage } from './TokenImage';

const COLLECTIBLE_CARD_IMAGE_HEIGHT = 'full';
const COLLECTIBLE_CARD_IMAGE_WIDTH = 'full';

export function CollectibleCard({
  assetId,
  tokenId,
}: {
  assetId: string;
  tokenId?: bigint | undefined;
}) {
  const { address, contract, asset } = getAssetNameParts(assetId);
  const contractId = `${address}.${contract}`;

  const { data: tokenMetadata } = useNftMetadata(
    { contractId, tokenId: tokenId?.toString() },
    { enabled: !!tokenId, retry: 1, retryDelay: 2000 }
  );

  const { url, contentType } = useImageContentType(tokenMetadata?.metadata?.cached_image);

  const ticker = deriveTokenTickerFromAssetId(asset);

  return (
    <Link
      href={`https://gamma.io/stacks/nfts/${contractId}_${tokenId}`}
      target="_blank"
      cursor="pointer"
    >
      <Stack
        px={3}
        pt={3}
        pb={4}
        gap={3}
        border="1px solid"
        borderColor="redesignBorderSecondary"
        borderRadius="redesign.xl"
        w="full"
        _hover={{ bg: 'surfacePrimary' }}
        className="group"
      >
        <Box
          w="full"
          h="full"
          overflow="hidden"
          borderRadius="redesign.xl"
          flexGrow={1}
          aspectRatio="1 / 1"
        >
          {url ? (
            <TokenImage
              url={url}
              alt={asset}
              height={COLLECTIBLE_CARD_IMAGE_HEIGHT}
              width={COLLECTIBLE_CARD_IMAGE_WIDTH}
              addGlow
            ></TokenImage>
          ) : (
            <DefaultTokenImage
              asset={asset}
              height={COLLECTIBLE_CARD_IMAGE_HEIGHT}
              width={COLLECTIBLE_CARD_IMAGE_WIDTH}
            />
          )}
        </Box>
        <Stack gap={3} minW={0}>
          <Flex alignItems="center" gap={1} minW={0}>
            <Link
              href={`https://gamma.io/stacks/nfts/${contractId}_${tokenId}`}
              target="_blank"
              variant="tableLink"
              _hover={{ color: 'textInteractiveHover' }}
              textStyle="text-medium-sm"
              textDecoration="underline"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              minW={0}
              maxW="full"
              display="inline-block"
            >
              {asset}
            </Link>
            <Icon color="iconTertiary" h={4} w={4}>
              <ArrowUpRight />
            </Icon>
          </Flex>
          <AddressLink
            principal={contractId}
            color="textSecondary"
            _hover={{ color: 'textInteractiveHover' }}
            textStyle="text-regular-sm"
            textDecoration="underline"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {ticker}
          </AddressLink>
        </Stack>
      </Stack>
    </Link>
  );
}
