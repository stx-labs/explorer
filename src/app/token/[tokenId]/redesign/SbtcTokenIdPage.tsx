'use client';

import { Sip10Alert } from '@/app/txid/[txId]/redesign/Alert';
import { Box, Grid, Stack } from '@chakra-ui/react';

import { SbtcFaqAccordion, SbtcFaqReverseAccordion } from './SbtcFaq';
import { TokenAlert } from './TokenAlert';
import { TokenIdHeader } from './TokenIdHeader';
import { TokenIdTabs } from './TokenIdTabs';
import { TokenStats } from './TokenStats';
import { TotalSupplyCard } from './TotalSupplyCard';

export function SbtcTokenIdPage() {
  return (
    <Stack gap={8}>
      <Grid
        templateColumns={{ base: '100%', lg: '75% 25%' }}
        templateRows={{ base: 'auto', lg: 'auto auto' }}
        columnGap={2.5}
        rowGap={3}
        alignItems="start"
        className="desktop-token-id-overview"
      >
        <Stack gap={{ base: 3, lg: 8 }}>
          <TokenIdHeader />
          <TokenStats />
        </Stack>
        <Grid templateRows={{ base: '1fr', lg: '1fr auto' }} columnGap={2} rowGap={3} h="full">
          <TotalSupplyCard />
          <Box hideBelow="lg">
            <SbtcFaqReverseAccordion />
          </Box>
          <Box hideFrom="lg">
            <SbtcFaqAccordion />
          </Box>
        </Grid>
      </Grid>
      <TokenAlert />
      <TokenIdTabs />
    </Stack>
  );
}
