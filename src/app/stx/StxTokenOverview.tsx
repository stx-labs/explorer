'use client';

import { MarketDataCard } from '@/app/token/[tokenId]/redesign/TokenIdOverview';
import { SectionTabsContentContainer } from '@/common/components/SectionTabs';
import { TxsTable, defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { DEFAULT_OVERVIEW_TAB_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { Text } from '@/ui/Text';
import { Grid, Stack } from '@chakra-ui/react';

import { StxOverviewTable } from './StxOverviewTable';
import { STX_TX_FILTERS } from './consts';

const RecentTransactions = () => (
  <Stack gap={3}>
    <Text as="h2" textStyle="heading-xs" color="textPrimary">
      Recent transfers
    </Text>
    <TxsTable
      initialData={undefined}
      filters={STX_TX_FILTERS}
      pageSize={DEFAULT_OVERVIEW_TAB_TABLE_PAGE_SIZE}
      tableContainer={defaultTableContainer}
      disablePagination
    />
  </Stack>
);

function MobileStxTokenOverview() {
  return (
    <Stack gap={8} hideFrom="lg">
      <SectionTabsContentContainer h="fit-content">
        <StxOverviewTable />
      </SectionTabsContentContainer>
      <MarketDataCard />
      <RecentTransactions />
    </Stack>
  );
}

function DesktopStxTokenOverview() {
  return (
    <Grid
      templateColumns={'75% 25%'}
      templateRows={'auto auto'}
      columnGap={2.5}
      alignItems="start"
      hideBelow="lg"
    >
      <Stack gap={8}>
        <SectionTabsContentContainer h="fit-content">
          <StxOverviewTable />
        </SectionTabsContentContainer>
        <RecentTransactions />
      </Stack>
      <MarketDataCard />
    </Grid>
  );
}

export const StxTokenOverview = () => {
  return (
    <>
      <MobileStxTokenOverview />
      <DesktopStxTokenOverview />
    </>
  );
};
