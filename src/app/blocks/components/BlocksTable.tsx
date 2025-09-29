'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useBurnBlocksPaginated } from '@/common/queries/useBurnBlocksInfinite';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/ui/Tabs';
import BitcoinIcon from '@/ui/icons/BitcoinIcon';
import StxIcon from '@/ui/icons/StxIcon';
import { Flex, Icon, Text } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';

import { UpdateTableBannerRow } from '../../../common/components/table/UpdateTableBannerRow';
import { useSubscribeBlocks } from '../../_components/BlockList/Sockets/useSubscribeBlocks';
import { useBlocksData } from '../context';
import { useBlocksV2Paginated } from '../queries/useBlocksV2Queries';
import { bitcoinBlockColumns } from './columns/bitcoinBlockColumns';
import { stacksBlockColumns } from './columns/stacksBlockColumns';
import { useBitcoinTableData, useStacksTableData } from './hooks/useBlocksTableData';

type BlockViewType = 'bitcoin' | 'stacks';

const BLOCKS_TABLE_PAGE_SIZE = 30;

function BitcoinBlocksTable({ isActive }: { isActive: boolean }) {
  const { initialBtcBlocksData } = useBlocksData();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: BLOCKS_TABLE_PAGE_SIZE,
  });

  const btcBlocksQuery = useBurnBlocksPaginated(pagination.pageIndex, BLOCKS_TABLE_PAGE_SIZE, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    enabled: isActive,
    keepPreviousData: true,
    initialData: pagination.pageIndex === 0 ? initialBtcBlocksData?.btcBlocks : undefined,
  });

  const handlePageChange = useCallback((page: PaginationState) => {
    setPagination(prev => ({ ...prev, pageIndex: page.pageIndex }));
    window?.scrollTo(0, 0);
  }, []);

  const bitcoinTableData = useBitcoinTableData(btcBlocksQuery, pagination);
  const isLoading =
    (btcBlocksQuery.isLoading || btcBlocksQuery.isFetching) && bitcoinTableData.length === 0;

  return (
    <Table
      data={bitcoinTableData}
      columns={bitcoinBlockColumns}
      pagination={{
        manualPagination: true,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        totalRows: btcBlocksQuery.data?.total || initialBtcBlocksData?.btcBlocks?.total || 0,
        onPageChange: handlePageChange,
      }}
      isLoading={isLoading}
      isFetching={btcBlocksQuery.isFetching}
      bannerRow={null}
      tableContainerWrapper={table => (
        <TableContainer minH="500px" pt={{ base: 3, lg: 4 }}>
          {table}
        </TableContainer>
      )}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      tableProps={{ mt: { base: -3, lg: -4 } }}
    />
  );
}

function StacksBlocksTable({ isActive }: { isActive: boolean }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: BLOCKS_TABLE_PAGE_SIZE,
  });
  const [isStxSubscriptionActive, setIsStxSubscriptionActive] = useState(false);
  const [newStxBlocksAvailable, setNewStxBlocksAvailable] = useState(false);

  const stxBlocksQuery = useBlocksV2Paginated(pagination.pageIndex, BLOCKS_TABLE_PAGE_SIZE, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    enabled: isActive,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  useSubscribeBlocks(isStxSubscriptionActive, block => {
    setTimeout(() => {
      setNewStxBlocksAvailable(true);
    }, 5000);
    setIsStxSubscriptionActive(false);
  });

  useEffect(() => {
    if (!newStxBlocksAvailable && isActive) {
      setIsStxSubscriptionActive(true);
    }
  }, [newStxBlocksAvailable, isActive]);

  const handlePageChange = useCallback((page: PaginationState) => {
    const newPageIndex = page.pageIndex;
    setPagination(prev => ({ ...prev, pageIndex: newPageIndex }));
    window?.scrollTo(0, 0);
  }, []);

  const handleUpdateStx = useCallback(() => {
    setNewStxBlocksAvailable(false);
    stxBlocksQuery.refetch();
  }, [stxBlocksQuery]);

  const stacksTableData = useStacksTableData(stxBlocksQuery, pagination);
  const isLoading =
    (stxBlocksQuery.isLoading || stxBlocksQuery.isFetching) && stacksTableData.length === 0;

  return (
    <Table
      data={stacksTableData}
      columns={stacksBlockColumns}
      pagination={{
        manualPagination: true,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        totalRows: stxBlocksQuery.data?.total || 0,
        onPageChange: handlePageChange,
      }}
      isLoading={isLoading}
      isFetching={stxBlocksQuery.isFetching}
      bannerRow={
        newStxBlocksAvailable && pagination.pageIndex === 0 ? (
          <UpdateTableBannerRow
            onClick={handleUpdateStx}
            colSpan={stacksBlockColumns.length}
            message="New Stacks blocks have been mined. Update list"
          />
        ) : null
      }
      tableContainerWrapper={table => (
        <TableContainer minH="500px" pt={{ base: 3, lg: 4 }}>
          {table}
        </TableContainer>
      )}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      tableProps={{ mt: { base: -3, lg: -4 } }}
    />
  );
}

export function BlocksTable() {
  const [activeView, setActiveView] = useState<BlockViewType>('bitcoin');

  const handleViewChange = useCallback((view: BlockViewType) => {
    setActiveView(view);
  }, []);

  return (
    <TabsRoot
      variant="primary"
      size="redesignMd"
      value={activeView}
      onValueChange={details => handleViewChange(details.value as BlockViewType)}
    >
      <Flex align="center" gap={3} mb={4}>
        <Text textStyle="text-regular-sm" color="textSecondary">
          View by:
        </Text>
        <TabsList>
          <TabsTrigger value="bitcoin">
            <Flex align="center" gap={1.5}>
              <Icon w={4} h={4} color={activeView === 'bitcoin' ? 'textPrimary' : 'textSecondary'}>
                <BitcoinIcon />
              </Icon>
              Bitcoin block
            </Flex>
          </TabsTrigger>
          <TabsTrigger value="stacks">
            <Flex align="center" gap={1.5}>
              <Icon w={4} h={4} color={activeView === 'stacks' ? 'textPrimary' : 'textSecondary'}>
                <StxIcon />
              </Icon>
              Stacks block
            </Flex>
          </TabsTrigger>
        </TabsList>
      </Flex>

      <TabsContent value="bitcoin">
        <BitcoinBlocksTable isActive={activeView === 'bitcoin'} />
      </TabsContent>

      <TabsContent value="stacks">
        <StacksBlocksTable isActive={activeView === 'stacks'} />
      </TabsContent>
    </TabsRoot>
  );
}
