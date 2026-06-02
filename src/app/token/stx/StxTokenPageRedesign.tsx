'use client';

import { TokenIdHeader } from '@/app/token/[tokenId]/redesign/TokenIdHeader';
import { Stack } from '@chakra-ui/react';

import { StxTokenTabs } from './StxTokenTabs';

export default function StxTokenPageRedesign() {
  return (
    <Stack gap={8}>
      <TokenIdHeader />
      <StxTokenTabs />
    </Stack>
  );
}
