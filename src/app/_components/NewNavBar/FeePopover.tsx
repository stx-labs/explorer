import {
  TabPopoverContent,
  TabPopoverRoot,
  TabPopoverTrigger,
} from '@/common/components/TabPopover';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import StxIcon from '@/ui/icons/StxIcon';
import { Box, Flex, Icon, PopoverRootProps, Separator, Stack, Tabs } from '@chakra-ui/react';
import { CaretDown, CaretUp, Info, Lightning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

const FeeStatLine = ({
  priority,
  time,
  stxFee,
  usdFee,
}: {
  priority: string;
  time: string;
  stxFee: string;
  usdFee: string;
}) => {
  return (
    <Flex justifyContent="space-between">
      <Flex gap={1} alignItems="center">
        <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textPrimary">
          {priority}
        </Text>
        {priority === 'High' ? (
          <Icon color="textTertiary" h={3} w={3}>
            <Lightning weight="fill" />
          </Icon>
        ) : null}
        <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textTertiary" fontWeight="medium">
          {time}
        </Text>
      </Flex>
      <Flex fontFamily="var(--font-matter-mono)" alignItems="center" gap={1}>
        <Icon h={2.5} w={2.5} color="iconPrimary">
          <StxIcon />
        </Icon>
        <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textPrimary">{`${stxFee}`}</Text>
        <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textSecondary">{`/`}</Text>
        <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textSecondary">{`$${usdFee}`}</Text>
      </Flex>
    </Flex>
  );
};

const getFeeDescription = (id: Fee) => {
  if (id === 'average') {
    return 'Current average fee rates for all transaction types.';
  }
  if (id === 'transfer') {
    return 'Current fee rates for token and NFT transfers.';
  }
  if (id === 'contract-deploy') {
    return 'Current fee rates for smart contract deployment.';
  }
  if (id === 'contract-call') {
    return 'Current fee rates for contract calls (i.e: swapping, minting, or buying tokens and NFTs).';
  }
};

export const FeeStats = ({ stxPriceInUsd, id }: { stxPriceInUsd: string; id: Fee }) => {
  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <Flex justifyContent="space-between">
          <Flex gap={1} alignItems="center">
            <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textSecondary">
              Priority
            </Text>
            <Tooltip
              variant="redesignPrimary"
              size="lg"
              content="Higher fees increase the chances of a transaction being confirmed faster than others."
            >
              <Icon color="textSecondary" h={3.5} w={3.5}>
                <Info />
              </Icon>
            </Tooltip>
          </Flex>
          <Text fontSize={{ base: 'sm', lg: 'xs' }} color="textSecondary">
            Fee
          </Text>
        </Flex>
        <FeeStatLine priority="Low" time="~53s" stxFee="0.11" usdFee="0.01" />
        <Separator borderColor="redesignBorderSecondary" />
        <FeeStatLine priority="Standard" time="~24s" stxFee="0.18" usdFee="0.05" />
        <Separator borderColor="redesignBorderSecondary" />
        <FeeStatLine priority="High" time="~12s" stxFee="0.25" usdFee="0.11" />
      </Stack>
      <Flex alignItems="flex-start" justifyContent="space-between" w="full">
        <Text
          fontStyle="italic"
          fontSize={{ base: 'sm', lg: 'xs' }}
          whiteSpace="wrap"
          color="textSecondary"
          w="50%"
        >
          {getFeeDescription(id)}
        </Text>
        <Flex
          alignItems="center"
          justifyContent="center"
          bg="surfaceFifth"
          borderRadius="redesign.md"
          gap={1}
          py={1.5}
          px={2}
          h="fit-content"
        >
          <Icon h={2.5} w={2.5} color="iconPrimary">
            <StxIcon />
          </Icon>
          <Text
            fontSize={{ base: 'sm', lg: 'xs' }}
            color="textPrimary"
            fontFamily="var(--font-matter-mono)"
          >{`1 STX = $${stxPriceInUsd}`}</Text>
        </Flex>
      </Flex>
    </Stack>
  );
};

type Fee = 'average' | 'transfer' | 'contract-deploy' | 'contract-call';

export const FeePopoverContent = ({ isOpen }: { isOpen?: boolean }) => {
  const tabs = useMemo(
    () => [
      {
        id: 'average',
        title: 'Average',
        content: <FeeStats stxPriceInUsd={'1.84'} id="average" />,
      },
      {
        id: 'transfer',
        title: 'Transfer',
        content: <FeeStats stxPriceInUsd={'1.84'} id="transfer" />,
      },
      {
        id: 'contract-deploy',
        title: 'Contract Deploy',
        content: <FeeStats stxPriceInUsd={'1.84'} id="contract-deploy" />,
      },
      {
        id: 'contract-call',
        title: 'Contract Call',
        content: <FeeStats stxPriceInUsd={'1.84'} id="contract-call" />,
      },
    ],
    []
  );

  return (
    <Box
      p={4}
      w={{ base: 'full', lg: '368px' }}
      h={{ base: 'fit-content', lg: '280px' }}
      borderRadius="redesign.lg"
      borderTopRightRadius={{ base: 'redesign.lg', lg: 'none' }}
      border="none"
      bg="surfacePrimary"
      fontFamily="var(--font-instrument-sans)"
      boxShadow={{ base: 'none', lg: isOpen ? 'var(--stacks-shadows-elevation2)' : 'none' }}
    >
      <Tabs.Root defaultValue={tabs[0].id}>
        <Tabs.List w="full" border={'none'} mb={4} p={0} minHeight={'auto'}>
          {tabs.map(tab => (
            <Tabs.Trigger
              key={`${tab.id}-title`}
              value={tab.id}
              p={0}
              color="textSecondary"
              _selected={{
                bg: 'surfaceInvert',
                color: 'textInvert',
                borderRadius: 'redesign.md',
                _hover: {
                  bg: 'surfaceInvert',
                  color: 'textInvert',
                },
                boxShadow: 'var(--stacks-shadows-elevation2)',
              }}
              _hover={{
                bg: 'surfaceTertiary',
                color: 'textPrimary',
              }}
              minWidth={{ base: 'fit-content', lg: 'auto' }}
              display={{ base: 'inline-block', lg: 'flex' }}
              alignItems="center"
              justifyContent="center"
              py={1}
              px={2}
              h="min-content"
              css={{
                '&:not(:last-of-type)': {
                  mr: 1,
                },
              }}
            >
              <Text whiteSpace="nowrap" fontSize={{ base: 'sm', lg: 'xs' }} fontWeight="medium">
                {tab.title}
              </Text>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map(tab => (
          <Tabs.Content key={`${tab.id}-content`} value={tab.id} h="full" p={0}>
            {tab.content}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  );
};

const POSITIONING: PopoverRootProps['positioning'] = {
  placement: 'bottom-end',
  offset: {
    mainAxis: 8,
  },
};

export const FeePopover = () => {
  const [open, setOpen] = useState(false);

  return (
    <TabPopoverRoot
      id="fee-popover"
      positioning={POSITIONING}
      open={open}
      onOpenChange={e => setOpen(e.open)}
      lazyMount
    >
      <TabPopoverTrigger open={open} positioning={POSITIONING}>
        <Flex
          bg="surfacePrimary"
          borderRadius="redesign.lg"
          borderTopRadius="redesign.lg"
          borderBottomRadius={open ? 'none' : 'redesign.lg'}
          py={1.5}
          px={4}
          gap={3}
          h={10}
          alignItems="center"
          justifyContent="center"
          className="group"
          cursor="pointer"
        >
          <Flex alignItems="center">
            <Text
              fontSize="xs"
              fontFamily="var(--font-matter-mono)"
              color="textSecondary"
              _groupHover={{ color: 'textPrimary' }}
            >
              Fees:
            </Text>
            &nbsp;
            <Text fontSize="xs" fontFamily="var(--font-matter-mono)" color="textPrimary">
              0.18 STX
            </Text>
          </Flex>

          <Icon color="textSecondary" _groupHover={{ color: 'textPrimary' }} h={3} w={3}>
            {open ? <CaretUp /> : <CaretDown />}
          </Icon>
        </Flex>
      </TabPopoverTrigger>
      <TabPopoverContent positioning={POSITIONING}>
        <FeePopoverContent isOpen={open} />
      </TabPopoverContent>
    </TabPopoverRoot>
  );
};
