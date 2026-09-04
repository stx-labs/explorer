import { OverviewCard } from '@/common/components/OverviewCard';
import { Text } from '@/ui/Text';
import StxThinIcon from '@/ui/icons/StacksThinIcon';
import { Flex, Grid, Icon, Stack } from '@chakra-ui/react';

export const Overview = () => {
  return (
    <Stack gap={5} aria-labelledby="overview-heading">
      <Text textStyle="heading-md">Overview</Text>
      <Grid
        display={{ base: 'grid', md: 'none', lg: 'grid' }}
        gap={3}
        templateColumns={{
          base: '1fr',
          lg: 'repeat(5, 1fr)',
        }}
      >
        {overviewCards.map(card => (
          <OverviewCard key={card.title} {...card} />
        ))}
      </Grid>
      <Stack display={{ base: 'none', md: 'flex', lg: 'none' }} gap={3}>
        <Grid templateColumns={'repeat(2, 1fr)'} gap={3}>
          {overviewCards.slice(0, 2).map(card => (
            <OverviewCard key={card.title} {...card} />
          ))}
        </Grid>
        <Grid templateColumns={'repeat(3, 1fr)'} gap={3}>
          {overviewCards.slice(2).map(card => (
            <OverviewCard key={card.title} {...card} />
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
};

const overviewCards = [
  {
    title: 'Transactions',
    stat: '2,307',
    subStat: 'Average 122 txs per hour',
  },
  {
    title: 'Average transaction fee',
    stat: (
      <Flex gap={0.5} alignItems="center">
        <Icon aria-hidden="true">
          <StxThinIcon />
        </Icon>
        <Text fontWeight="medium" fontSize={'2xl'} color={'textPrimary'} whiteSpace="nowrap">
          0.002 STX
        </Text>
      </Flex>
    ),
    subStat: '$0.35',
  },
  {
    title: 'Fees paid',
    stat: (
      <Flex gap={0.5} alignItems="center">
        <Icon aria-hidden="true">
          <StxThinIcon />
        </Icon>
        <Text fontWeight="medium" fontSize={'2xl'} color={'textPrimary'} whiteSpace="nowrap">
          4,212 STX{' '}
        </Text>
      </Flex>
    ),
    subStat: '$4,213',
  },
  {
    title: 'Contracts deployed',
    stat: 232,
  },
  {
    title: 'Contract calls',
    stat: 643,
  },
];
