'use client';

import { Text } from '@/ui/Text';
import { Box, Flex } from '@chakra-ui/react';
import Image from 'next/image';
import { useState } from 'react';

export const DefaultTokenImage = ({
  asset,
  height,
  width,
}: {
  asset: string;
  height: number;
  width: number;
}) => {
  return (
    <Flex
      h={height}
      w={width}
      alignItems="center"
      justifyContent="center"
      bg="surfaceFifth"
      borderRadius="redesign.xl"
      className="default-token-image"
    >
      <Text textStyle="text-regular-sm" color="textPrimary" fontFamily="matterMono">
        {asset[0].toUpperCase()}
      </Text>
    </Flex>
  );
};

export const TokenImage = ({
  url,
  alt,
  height,
  width,
  addGlow,
}: {
  url: string;
  alt: string;
  height: number;
  width: number;
  addGlow?: boolean;
}) => {
  const [imageUrl, setImageUrl] = useState<string>(encodeURI(decodeURI(url)));
  const [badImage, setBadImage] = useState<boolean>(false);
  const fallbackImageUrl = imageUrl.replace(
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/'
  );
  if (badImage) {
    return <DefaultTokenImage asset={alt} height={height} width={width} />;
  }
  return addGlow ? (
    <Box position="relative" width={width} height={height}>
      <Image
        fill // makes the image fill its positioned parent container
        src={imageUrl}
        onError={e => {
          if (imageUrl !== fallbackImageUrl) {
            setImageUrl(fallbackImageUrl);
          } else {
            setBadImage(true);
          }
        }}
        alt={alt}
        style={{
          filter: 'blur(9px)',
          borderRadius: '16px',
          objectFit: 'cover', // ensures the image maintains its aspect ratio while covering the entire container, cropping if necessary to maintain the 1:1 ratio
        }}
      />
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        borderRadius="16px"
        zIndex={1}
        height={height}
        width={width}
      >
        <Image
          fill
          src={imageUrl}
          onError={e => {
            if (imageUrl !== fallbackImageUrl) {
              setImageUrl(fallbackImageUrl);
            } else {
              setBadImage(true);
            }
          }}
          alt={alt}
          style={{
            borderRadius: '16px',
          }}
        />
      </Box>
    </Box>
  ) : (
    <Box position="relative" width={width} height={height}>
      <Image
        fill
        src={imageUrl}
        onError={e => {
          if (imageUrl !== fallbackImageUrl) {
            setImageUrl(fallbackImageUrl);
          } else {
            setBadImage(true);
          }
        }}
        alt={alt}
        style={{
          objectFit: 'cover',
        }}
      />
    </Box>
  );
};
