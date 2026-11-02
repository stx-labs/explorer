import { useSubscribeBlocks } from '@/app/_components/BlockList/Sockets/useSubscribeBlocks';
import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { ChakraProviderWrapper } from '../../../../utils/test-utils/render-utils';
import { InfiniteTxSummaryTable, InfiniteTxSummaryTableProps } from '../InfiniteTxSummaryTable';

jest.mock('@/app/_components/BlockList/Sockets/useSubscribeBlocks', () => ({
  useSubscribeBlocks: jest.fn(),
}));
jest.mock('@/app/_components/BlockList/Sockets/useSubscribeTxs', () => ({
  useSubscribeTxs: jest.fn(),
}));
jest.mock('@/features/txsFilterAndSort/useFilterAndSortState', () => ({
  useFilterAndSortState: jest.fn(),
}));
jest.mock('../../Table', () => ({
  Table: ({ data }: { data: Array<{ tx: { tx_id: string } }> }) => (
    <div>
      {data.map(row => (
        <span key={row.tx.tx_id}>{row.tx.tx_id}</span>
      ))}
    </div>
  ),
}));
jest.mock('../../../ListFooter', () => ({
  ListFooter: ({ fetchNextPage }: { fetchNextPage: () => void }) => (
    <button onClick={() => fetchNextPage()}>load-more</button>
  ),
}));

const mockBlocks = useSubscribeBlocks as jest.MockedFunction<typeof useSubscribeBlocks>;
const mockMempool = useSubscribeTxs as jest.MockedFunction<typeof useSubscribeTxs>;
const mockFilter = useFilterAndSortState as jest.MockedFunction<typeof useFilterAndSortState>;

const queryKey = ['feed'];
const tx = (tx_id: string, type = 'coinbase') => ({ tx_id, type }) as never;

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProviderWrapper>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ChakraProviderWrapper>
);

function renderTable(overrides: Partial<InfiniteTxSummaryTableProps> = {}) {
  const props: InfiniteTxSummaryTableProps = {
    txs: [tx('0x01'), tx('0x02', 'token_transfer')],
    columns: [],
    queryKey,
    liveUpdates: 'blocks',
    isLoading: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    hasNextPage: true,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
  render(<InfiniteTxSummaryTable {...props} />, { wrapper });
  return props;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  queryClient = new QueryClient();
  mockFilter.mockReturnValue({ activeFilters: [] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
});

afterEach(() => jest.useRealTimers());

test('listens for new blocks on the confirmed feed and mempool txs on the pending feed', () => {
  renderTable({ liveUpdates: 'blocks' });
  expect(mockBlocks).toHaveBeenCalled();
  expect(mockMempool).not.toHaveBeenCalled();

  jest.clearAllMocks();
  renderTable({ liveUpdates: 'mempool' });
  expect(mockMempool).toHaveBeenCalled();
  expect(mockBlocks).not.toHaveBeenCalled();
});

test('passes a stable update handler so the socket is not resubscribed every render', () => {
  renderTable();
  const handlers = mockBlocks.mock.calls.map(([, handler]) => handler);
  expect(new Set(handlers).size).toBe(1);
});

test('refresh trims the cached feed to its first page before refetching', () => {
  queryClient.setQueryData(queryKey, {
    pages: ['p1', 'p2', 'p3'],
    pageParams: [undefined, 'a', 'b'],
  });
  const props = renderTable();

  const onUpdate = mockBlocks.mock.calls[mockBlocks.mock.calls.length - 1][1];
  act(() => onUpdate({} as never));
  act(() => jest.advanceTimersByTime(5000));
  fireEvent.click(
    screen.getByRole('button', { name: 'New transactions have come in. Update list' })
  );

  expect(queryClient.getQueryData(queryKey)).toEqual({ pages: ['p1'], pageParams: [undefined] });
  expect(props.refetch).toHaveBeenCalledTimes(1);
});

test('load more does not cancel an in-flight refetch', () => {
  const props = renderTable();
  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(props.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
});

test('filters the loaded rows by the selected types', () => {
  mockFilter.mockReturnValue({ activeFilters: ['token_transfer'] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
  renderTable();
  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.queryByText('0x01')).not.toBeInTheDocument();
});
