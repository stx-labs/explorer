'use client';

import { getHasSBTCInName, getIsSBTC } from '@/app/tokens/utils';
import { Link } from '@/ui/Link';
import { Box, Flex, Icon, Image, Stack } from '@chakra-ui/react';
import { SealCheck, Warning } from '@phosphor-icons/react';
import { ReactNode, useMemo } from 'react';

import { Sip10Disclaimer } from '../../../common/components/Sip10Disclaimer';
import { Tag } from '../../../components/ui/tag';
import { TagLabel } from '../../../ui/TagLabel';
import { Text } from '../../../ui/Text';
import { PageTitle } from '../../_components/PageTitle';
import { TokenTabs } from './Tabs';
import { TokenInfo } from './TokenInfo';
import { RISKY_TOKENS, VERIFIED_TOKENS, legitsBTCDerivatives } from './consts';
import { TokenInfoProps } from './types';
import { useTokenIdPageData } from './redesign/context/TokenIdPageContext';

const WarningMessage = ({ text }: { text: string | ReactNode }) => {
  return (
    <Box borderRadius="xl" bg="red.200" p={4}>
      <Flex gap={2} alignItems="center">
        <Icon h={4} w={4} color="red.600">
          <Warning />
        </Icon>
        <Text fontWeight="bold" color="black">
          Warning:
        </Text>
      </Flex>
      <Box pl={4 + 2}>
        <Text fontSize="sm" color="black">
          {text}
        </Text>
      </Box>
    </Box>
  );
};

export default function TokenIdPage() {
  const { tokenId, tokenInfo } = useTokenIdPageData();
  if (!tokenInfo.basic) throw new Error('Could not find token info');
  const { name, symbol, imageUri } = tokenInfo.basic;
  const categories = tokenInfo.extended?.categories || [];
  const hasSBTCInName = getHasSBTCInName(name ?? '', symbol ?? '');
  const isSBTC = getIsSBTC(tokenId);
  const isRisky = RISKY_TOKENS.includes(tokenId);

  const warningMessage = useMemo(() => {
    if (isRisky) {
      return (
        <WarningMessage
          text=" This token may be a scam. Engaging with unverified tokens could result in loss of
              funds."
        />
      );
    }

    if (hasSBTCInName && !isSBTC && !legitsBTCDerivatives.includes(tokenId)) {
      return (
        <WarningMessage
          text={
            <Text>
              This is not{' '}
              <Link
                href="https://explorer.hiro.so/token/SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token?chain=mainnet"
                color="black"
              >
                the official sBTC token
              </Link>{' '}
              and may be a scam. Engaging with unverified tokens could result in loss of funds.
            </Text>
          }
        />
      );
    }

    return null;
  }, [hasSBTCInName, isRisky, isSBTC, tokenId]);

  return (
    <>
      <Stack gap={2}>
        {!!categories.length && (
          <Flex gap={2}>
            {categories.map(category => (
              <Tag key={category}>
                <TagLabel>{category}</TagLabel>
              </Tag>
            ))}
          </Flex>
        )}
        <Flex alignItems={'center'} gap={2} flexWrap="wrap">
          <Image src={imageUri} alt={name ?? ''} h={10} w={10} />
          <PageTitle>
            {name} ({symbol})
          </PageTitle>
          {(isSBTC || VERIFIED_TOKENS.includes(tokenId)) && (
            <Tag
              color="green.600"
              bg="green.300"
              border="1px solid var(--stacks-colors-green-500)"
              pt={1}
              py={2.5}
            >
              <Flex alignItems={'center'} gap={1}>
                <Icon h={4} w={4} color="green.600">
                  <SealCheck />
                </Icon>
                <Text fontSize={'md'}>Verified</Text>
              </Flex>
            </Tag>
          )}
          {!!warningMessage && (
            <Tag
              color="red.600"
              bg="red.200"
              border="1px solid var(--stacks-colors-red-500)"
              pt={1}
              py={2.5}
            >
              <Flex alignItems={'center'} gap={1}>
                <Icon h={4} w={4} color="red.600">
                  <Warning />
                </Icon>
                <Text fontSize={'md'}>Unverified</Text>
              </Flex>
            </Tag>
          )}
        </Flex>
      </Stack>
      {warningMessage}
      <TokenInfo tokenInfo={tokenInfo} tokenId={tokenId} />
      <TokenTabs
        tokenId={tokenId}
        developerData={
          !!tokenInfo.extended?.links?.repos?.length ? tokenInfo.extended?.developerData : undefined
        }
        tokenInfo={tokenInfo}
      />
      <Sip10Disclaimer />
    </>
  );
}
