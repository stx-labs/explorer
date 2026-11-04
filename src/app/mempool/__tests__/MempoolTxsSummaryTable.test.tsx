import { InfiniteTxSummaryTable } from '@/common/components/table/table-examples/InfiniteTxSummaryTable';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import {
  mempoolTxSummariesInfiniteQueryKey,
  useMempoolTxSummariesInfinite,
} from '@/common/queries/useMempoolTxSummaries';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { ReactNode } from 'react';

import { MempoolTxsSummaryTable } from '../MempoolTxsSummaryTable';

jest.mock('@/app/_components/ErrorBoundary', () => ({
  ExplorerErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/common/components/table/table-examples/InfiniteTxSummaryTable', () => ({
  InfiniteTxSummaryTable: jest.fn(() => null),
}));
jest.mock('@/common/context/useGlobalContext');
jest.mock('@/common/queries/useMempoolTxSummaries', () => ({
  ...jest.requireActual('@/common/queries/useMempoolTxSummaries'),
  useMempoolTxSummariesInfinite: jest.fn(),
}));
jest.mock('@/features/txsFilterAndSort/useFilterAndSortState', () => ({
  useFilterAndSortState: jest.fn(),
}));

const mockTable = InfiniteTxSummaryTable as jest.MockedFunction<typeof InfiniteTxSummaryTable>;
const mockFeed = useMempoolTxSummariesInfinite as jest.MockedFunction<
  typeof useMempoolTxSummariesInfinite
>;
const lastTableProps = () => mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
const lastView = () => mockFeed.mock.calls[mockFeed.mock.calls.length - 1][1];

let queryClient: QueryClient;
const renderTable = (initialData?: never) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MempoolTxsSummaryTable initialData={initialData} />
    </QueryClientProvider>
  );

const mockActiveFilters = (activeFilters: string[]) =>
  (useFilterAndSortState as jest.Mock).mockReturnValue({ activeFilters });

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient();
  (useGlobalContext as jest.Mock).mockReturnValue({ activeNetwork: { networkId: 1 } });
  mockFeed.mockReturnValue({ data: undefined } as never);
  mockActiveFilters([]);
});

test('starts with the newest received first, shown on the Received header', () => {
  renderTable();
  expect(lastView()).toEqual({ types: [], sortBy: 'receipt_time', order: 'desc' });
  expect(lastTableProps().serverSorting?.sorting).toEqual([{ id: 'blockTime', desc: true }]);
});

test('requests the order picked on the Fee and Received headers from the API', () => {
  renderTable();
  act(() => lastTableProps().serverSorting!.onSortChange('fee', 'asc'));
  expect(lastView()).toMatchObject({ sortBy: 'fee', order: 'asc' });

  act(() => lastTableProps().serverSorting!.onSortChange('blockTime', 'asc'));
  expect(lastView()).toMatchObject({ sortBy: 'receipt_time', order: 'asc' });
});

test('has the API filter by the selected types that can be pending', () => {
  mockActiveFilters(['token_transfer', 'coinbase']);
  renderTable();
  expect(lastView()).toMatchObject({ types: ['token_transfer'] });
});

test('seeds the server-rendered page as the default view', () => {
  const initialData = { results: [] } as never;
  renderTable(initialData);
  expect(
    queryClient.getQueryData(mempoolTxSummariesInfiniteQueryKey(1, TX_TABLE_PAGE_SIZE))
  ).toEqual({
    pages: [initialData],
    pageParams: [undefined],
  });
});
