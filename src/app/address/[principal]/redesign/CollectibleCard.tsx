'use client';

import { useNftMetadata } from '@/common/queries/useNftMetadata';
import { deriveTokenTickerFromAssetId } from '@/common/utils/fungible-token-utils';
import { getAssetNameParts } from '@/common/utils/utils';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import { Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { useImageContentType } from '../TokenBalanceCard/useImageUrl';
import { DefaultTokenImage, TokenImage } from './TokenImage';

const COLLECTIBLE_CARD_IMAGE_HEIGHT = 136;
const COLLECTIBLE_CARD_IMAGE_WIDTH = 136;

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

  const nftImage = url ? (
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
  );

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
        w="fit-content"
        _hover={{ bg: 'surfacePrimary' }}
        className="group"
      >
        {nftImage}
        <Grid templateColumns="1fr 28px" gap={1} w="full">
          <Stack gap={3} minW={0}>
            <Text
              textStyle="text-medium-sm"
              color="textPrimary"
              textDecoration="underline"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {asset}
            </Text>
            <Text
              textStyle="text-regular-sm"
              color="textSecondary"
              textDecoration="underline"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {ticker}
            </Text>
          </Stack>
          <Stack h="full" justifyContent="flex-end">
            <Flex
              p={2}
              borderRadius="full"
              bg="surfaceFifth"
              alignItems="center"
              justifyContent="center"
              visibility="hidden"
              _groupHover={{ visibility: 'visible' }}
            >
              <Icon h={3} w={3} color="iconPrimary">
                <ArrowUpRight weight="bold" />
              </Icon>
            </Flex>
          </Stack>
        </Grid>
      </Stack>
    </Link>
  );
}
