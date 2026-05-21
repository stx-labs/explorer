'use client';

import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon, Link, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import Image from 'next/image';

interface SBTCOverviewProps {
  totalSupply: number;
  totalSupplyUsd: number;
}

export function SBTCOverview({ totalSupply, totalSupplyUsd }: SBTCOverviewProps) {
  return (
    <Box
      bg="surfaceSecondary"
      borderRadius="3xl"
      p={8}
      position="relative"
      overflow="hidden"
      minH="283px"
    >
      <Stack gap={6} position="relative" zIndex={1} maxW="280px">
        <Stack gap={3}>
          <Text textStyle="text-medium-lg" color="textPrimary">
            Total supply
          </Text>
          <Text textStyle="heading-lg" color="textPrimary" lineHeight="redesign.none">
            {formatNumber(totalSupply, 0, 0)} sBTC
          </Text>
          <Text textStyle="heading-sm" color="textSecondary" lineHeight="redesign.tighter">
            ({formatUsdValue(totalSupplyUsd, 0, 0)})
          </Text>
        </Stack>
        <Link
          href="https://sbtc.stacks.co/"
          target="_blank"
          rel="noopener noreferrer"
          bg="accent.stacks-500"
          color="neutral.sand-1000"
          h={10}
          px={4}
          py={1.5}
          borderRadius="redesign.lg"
          fontWeight="medium"
          fontSize="sm"
          display="inline-flex"
          alignItems="center"
          gap={1}
          width="fit-content"
          textDecoration="none"
          boxShadow="0 6px 20px rgba(252, 100, 50, 0.5)"
          _hover={{ opacity: 0.9, textDecoration: 'none' }}
        >
          Get sBTC
          <Icon w={4} h={4}>
            <ArrowUpRight weight="bold" />
          </Icon>
        </Link>
      </Stack>
      <Flex position="absolute" bottom={0} right={0} pointerEvents="none">
        <Image src="/sbtc-bubbles.svg" alt="" width={262} height={170} />
      </Flex>
    </Box>
  );
}
