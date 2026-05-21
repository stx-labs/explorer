'use client';

import { SBTC_ASSET_ID } from '@/app/token/[tokenId]/consts';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { SBTCOverview } from './SBTCOverview';
import { SBTCTransactions } from './SBTCTransactions';
import { SBTCData } from './types';

interface SBTCSectionProps {
  sbtcData?: SBTCData;
}

export function SBTCSection({ sbtcData }: SBTCSectionProps) {
  const network = useGlobalContext().activeNetwork;

  return (
    <Flex direction="column" flex={1} width="100%">
      <Flex justifyContent="space-between" alignItems="center" mb={3.5}>
        <Text textStyle="heading-md" color="textPrimary">
          sBTC
        </Text>
        <ButtonLink href={buildUrl(`/token/${SBTC_ASSET_ID}`, network)} buttonLinkSize="big" mr={2}>
          Explore sBTC
        </ButtonLink>
      </Flex>
      <SBTCOverview
        totalSupply={sbtcData?.totalSupply ?? 0}
        totalSupplyUsd={sbtcData?.totalSupplyUsd ?? 0}
      />
      <Stack mt={8}>
        <SBTCTransactions transactions={sbtcData?.recentTransactions ?? []} />
      </Stack>
    </Flex>
  );
}
