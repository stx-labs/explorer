import { TokenVideo } from '@/app/address/[principal]/TokenBalanceCard/TokenVideo';
import { useImageContentType } from '@/app/address/[principal]/TokenBalanceCard/useImageUrl';
import { TokenLink } from '@/common/components/ExplorerLinks';
import { isRiskyToken, isVerifiedToken } from '@/common/utils/fungible-token-utils';
import { SimpleTag } from '@/ui/Badge';
import { Flex, Icon } from '@chakra-ui/react';
import { SealCheck, Warning } from '@phosphor-icons/react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { Circle } from '../../../../common/components/Circle';
import { FungibleTokenTableTokenColumnData } from './FungibleTokensTable';

export function DefaultTokenAvatar({ asset }: { asset: string }) {
  return (
    <Circle h={6} w={6}>
      {asset[0].toUpperCase()}
    </Circle>
  );
}

export function FungibleTokenCellRenderer(value: FungibleTokenTableTokenColumnData) {
  const { name, ticker, tokenId, imageUrl } = value;
  const isVerified = isVerifiedToken(tokenId);
  const isRisky = isRiskyToken(tokenId);
  const { url, contentType } = useImageContentType(imageUrl);

  let tokenAvatar;
  if (!url) {
    tokenAvatar = <DefaultTokenAvatar asset={name} />;
  } else if (contentType?.startsWith('video')) {
    tokenAvatar = <TokenVideo url={url} />;
  } else {
    tokenAvatar = <TokenImage url={url} alt={name} />;
  }

  return (
    <Flex gap={3} alignItems="center">
      {tokenAvatar}
      <Flex gap={1.5} alignItems="center">
        <TokenLink
          tokenId={tokenId}
          variant="tableLink"
          textStyle="text-regular-sm"
          whiteSpace="nowrap"
          flexShrink={0}
        >
          {name}
        </TokenLink>
        <SimpleTag
          label={ticker}
          _groupHover={{
            bg: 'surfaceTertiary',
          }}
        />
        {isVerified && (
          <Icon h={3.5} w={3.5} color="iconSuccess">
            <SealCheck weight="fill" />
          </Icon>
        )}
        {isRisky && (
          <Icon h={3.5} w={3.5} color="iconError">
            <Warning weight="fill" />
          </Icon>
        )}
      </Flex>
    </Flex>
  );
}

export const TokenImage = ({ url, alt, ...props }: { url: string; alt: string }) => {
  const [error, setError] = useState<boolean>(false);

  const imageUrl = useMemo(() => {
    const fallbackImageUrl = url.replace(
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    );
    const selectedImageUrl = error
      ? url !== fallbackImageUrl
        ? fallbackImageUrl
        : undefined
      : url;
    const encodedImageUrl = selectedImageUrl ? encodeURI(decodeURI(selectedImageUrl)) : undefined;
    return encodedImageUrl;
  }, [error, url]);

  if (!imageUrl) {
    return <DefaultTokenAvatar asset={alt} />;
  }

  return (
    <Image
      width={24}
      height={24}
      src={imageUrl}
      onError={e => {
        setError(true);
      }}
      alt={alt}
      {...props}
    />
  );
};
