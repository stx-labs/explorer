'use client';

import { useTokenIdPageData } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { isSBTC } from '@/app/tokens/utils';
import { Sip10Alert } from '@/app/txid/[txId]/redesign/Alert';
import { Stack } from '@chakra-ui/react';

import { SbtcTokenIdPage } from './redesign/SbtcTokenIdPage';
import { TokenAlert } from './redesign/TokenAlert';
import { TokenIdHeader } from './redesign/TokenIdHeader';
import { TokenIdTabs } from './redesign/TokenIdTabs';

export default function TokenIdPageRedesign() {
  const { tokenId } = useTokenIdPageData();
  const isSbtc = isSBTC(tokenId);

  if (isSbtc) {
    return <SbtcTokenIdPage />;
  }

  return (
    <Stack gap={8}>
      <TokenIdHeader />
      <TokenAlert />
      <TokenIdTabs />
      <Sip10Alert />
    </Stack>
  );
}
