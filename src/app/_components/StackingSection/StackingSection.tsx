'use client';

import { useHomePageData } from '@/app/context';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { abbreviateNumber } from '@/common/utils/utils';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import BitcoinCircleIcon from '@/ui/icons/BitcoinCircleIcon';
import ProgressDot from '@/ui/icons/ProgressDot';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import StxSquareIcon from '@/ui/icons/StxSquareIcon';
import { Box, BoxProps, Flex, HStack, Icon, Stack } from '@chakra-ui/react';

import { SSRDisabledMessage } from '../SSRDisabledMessage';

function ProgressKnob({ diameter, ...boxProps }: { diameter: number } & BoxProps) {
  return (
    <Box
      bg={{ base: 'white', _dark: 'neutral.sand-900' }}
      h={diameter}
      w={diameter}
      borderRadius={'redesign.2xl'}
      position="absolute"
      top="50%"
      bottom="50%"
      m="auto"
      {...boxProps}
    />
  );
}

function ProgressBar({ percentage }: { percentage?: number }) {
  const PROGRESS_KNOB_DIAMETER = 1;
  return (
    <Stack
      bg={{
        base: 'neutral.sand-200',
        _dark: 'neutral.sand-700',
      }}
      h={2}
      borderRadius={'redesign.xl'}
      w="100%"
      position="relative"
    >
      <Stack
        bg={'accent.stacks-500'}
        h={2}
        borderRadius={'redesign.2xl'}
        w={`${percentage}%`}
        position="absolute"
        boxShadow={'0px 2px 10px 0px rgba(255, 85, 18, 0.50)'}
      />
      <ProgressKnob
        diameter={PROGRESS_KNOB_DIAMETER}
        left={`calc(var(--stacks-spacing-${PROGRESS_KNOB_DIAMETER}) / 2)`}
      />
      <ProgressKnob
        diameter={PROGRESS_KNOB_DIAMETER}
        right={`calc(var(--stacks-spacing-${PROGRESS_KNOB_DIAMETER}) / 2)`}
      />
    </Stack>
  );
}

function CycleHeader() {
  const homePageData = useHomePageData();
  if (!homePageData.stackingCycle) {
    return null;
  }
  const { approximateDaysTilNextCycle, cycleId } = homePageData.stackingCycle;
  return (
    <Flex
      gap="2"
      height="100%"
      justify={'space-between'}
      alignItems={'start'}
      flexDirection={{ base: 'column', sm: 'row' }}
    >
      <Stack justify={'space-between'}>
        <Text textStyle={'heading-xs'} whiteSpace={'nowrap'}>
          Current cycle
        </Text>
        <Flex
          borderRadius={['redesign.xl', 'redesign.2xl']}
          gap={1.5}
          color="textPrimary"
          bg="surfaceTertiary"
          px="4"
          py="2"
          width="fit-content"
        >
          <Text textStyle={['heading-md', 'heading-lg']} lineHeight={'redesign.none'}>
            {cycleId}
          </Text>
        </Flex>
      </Stack>
      <Flex
        borderRadius={['redesign.md', 'redesign.lg']}
        gap={2}
        color="textPrimary"
        boxShadow={'elevation1'}
        px={3}
        py={1}
        border={'1px solid'}
        borderColor={'redesignBorderSecondary'}
        alignItems={'center'}
      >
        <Icon w="4" h="4" color={'feedback.green-500'}>
          <ProgressDot />
        </Icon>
        <Text
          textStyle="heading-xs"
          fontSize={['sm', 'xl']}
          fontWeight={['medium', 'regular']}
          whiteSpace={'nowrap'}
        >
          {approximateDaysTilNextCycle < 1
            ? 'Ends today'
            : approximateDaysTilNextCycle >= 1 && approximateDaysTilNextCycle < 2
              ? `Ends in ~${approximateDaysTilNextCycle} day`
              : `Ends in ~${approximateDaysTilNextCycle} days`}
        </Text>
      </Flex>
    </Flex>
  );
}

function StxStats() {
  const { stackingCycle } = useHomePageData();
  const stxPrice = useGlobalContext().tokenPrice.stxPrice;
  if (!stackingCycle) {
    return null;
  }
  const { stackedStx } = stackingCycle;
  return (
    <Flex flexWrap={'wrap'}>
      <Flex alignItems={'center'} gap={0.5}>
        <Icon w="4.5" h="4.5">
          <StacksIconThin />
        </Icon>
        <Text whiteSpace={'nowrap'} textStyle={['heading-xs', 'heading-sm']}>
          {abbreviateNumber(stackedStx, 1)} STX
        </Text>
      </Flex>
      &nbsp;
      <Flex alignItems={'center'} gap={0.5}>
        <Text
          textStyle={['heading-xs', 'heading-sm']}
          color="textSecondary"
          display={'inline'}
          whiteSpace={'nowrap'}
        >
          / ${abbreviateNumber(Math.round(stxPrice * stackedStx), 1)}
        </Text>
        &nbsp;
        <Text whiteSpace={'nowrap'} textStyle={['heading-xs', 'heading-sm']}>
          stacked
        </Text>
      </Flex>
    </Flex>
  );
}

function CycleProgress() {
  const { stackingCycle } = useHomePageData();
  if (!stackingCycle) {
    return null;
  }
  const { approximateStartTimestamp, approximateEndTimestamp, progressPercentage } = stackingCycle;
  return (
    <Tooltip
      variant="redesignPrimary"
      size="lg"
      content={`${progressPercentage ? progressPercentage : 0}% completed`}
    >
      <Stack gap={4}>
        <Stack gap={1}>
          <HStack justify={'space-between'}>
            <Text textStyle={'text-medium-sm'} color="textPrimary">
              Started
            </Text>
            <Text textStyle={'text-medium-sm'} color="textPrimary">
              Ends
            </Text>
          </HStack>
          <ProgressBar percentage={progressPercentage} />
        </Stack>
        <HStack justify={'space-between'}>
          <Text
            textStyle={'text-medium-xs'}
            color="textPrimary"
            borderRadius={'redesign.md'}
            bg={'surfaceFifth'}
            px={2}
            py={1}
            suppressHydrationWarning
          >
            ~ {formatDateShort(approximateStartTimestamp)}
          </Text>
          <Text
            textStyle={'text-medium-xs'}
            color="textPrimary"
            borderRadius={'redesign.md'}
            bg={'surfaceFifth'}
            px={2}
            py={0.5}
            suppressHydrationWarning
          >
            ~ {formatDateShort(approximateEndTimestamp)}
          </Text>
        </HStack>
      </Stack>
    </Tooltip>
  );
}

function BlockInfo({
  height,
  hash,
  isActive = true,
  type,
}: {
  height: number;
  hash?: string;
  isActive?: boolean;
  type: 'bitcoin' | 'stacks';
}) {
  const network = useGlobalContext().activeNetwork;

  let content = (
    <HStack gap={1.5} px={1.5} py={1} borderRadius={'redesign.xs'} bg={'surfaceSecondary'}>
      <Icon
        w={3.5}
        h={3.5}
        aria-hidden="true"
        color={
          isActive
            ? type === 'bitcoin'
              ? 'accent.bitcoin-500'
              : 'accent.stacks-500'
            : 'iconTertiary'
        }
      >
        {type === 'bitcoin' ? <BitcoinCircleIcon /> : <StxSquareIcon />}
      </Icon>
      <Text
        textStyle={'text-mono-xs'}
        color={isActive ? 'textPrimary' : 'textSecondary'}
        className={'block-height'}
        lineHeight={'redesign.normal'}
        aria-label={`Block height: ${height}`}
      >
        {`#${height}`}
      </Text>
    </HStack>
  );

  if (isActive) {
    content = (
      <NextLink href={buildUrl(`${type === 'bitcoin' ? 'btcblock' : 'block'}/${hash}`, network)}>
        {content}
      </NextLink>
    );
  }

  return content;
}

function BlocksSection() {
  const { stackingCycle } = useHomePageData();
  if (!stackingCycle) {
    return null;
  }
  const {
    startBurnBlockHeight,
    startBurnBlockHash,
    startStacksBlockHeight,
    startStacksBlockHash,
    endBurnBlockHeight,
  } = stackingCycle;

  if (!startBurnBlockHash) {
    return null;
  }

  return (
    <HStack justify={'space-between'} align={'flex-start'}>
      <Flex gap={1.5} flexWrap={'wrap'}>
        <BlockInfo height={startBurnBlockHeight} hash={startBurnBlockHash} type="bitcoin" />
        {startStacksBlockHash && startStacksBlockHeight && (
          <BlockInfo height={startStacksBlockHeight} hash={startStacksBlockHash} type="stacks" />
        )}
      </Flex>
      <Flex gap={1.5} flexWrap={'wrap'} justify={'flex-end'}>
        <BlockInfo height={endBurnBlockHeight} type="bitcoin" isActive={false} />
      </Flex>
    </HStack>
  );
}

export function StackingSection() {
  const { isSSRDisabled } = useHomePageData();
  return (
    <Stack gap={4} flex={1}>
      <Text whiteSpace={'nowrap'} textStyle="heading-md" color="textPrimary">
        Stacking
      </Text>
      {isSSRDisabled ? (
        <SSRDisabledMessage />
      ) : (
        <Stack
          borderRadius={'redesign.xl'}
          bg="surfacePrimary"
          px={[4, 6]}
          py={[5, 6]}
          gap={6}
          flex={1}
        >
          <Stack gap={2.5}>
            <CycleHeader />
            <StxStats />
          </Stack>
          <Stack gap={3} flex={1}>
            <CycleProgress />
            <BlocksSection />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
