import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import { usePrincipalTxSummariesInfinite } from '@/common/queries/usePrincipalTxSummaries';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AddressTxsTable } from '../AddressTxsTable';

jest.mock('@/common/queries/usePrincipalTxSummaries', () => ({
  usePrincipalTxSummariesInfinite: jest.fn(),
}));
jest.mock('@/features/txsFilterAndSort/useFilterAndSortState', () => ({
  useFilterAndSortState: jest.fn(),
}));

// Mock the table shell + footer so the test targets AddressTxsTable's own wiring (summary → row
// mapping, type filter, cursor pagination) rather than the full columnar render tree.
jest.mock('../../Table', () => ({
  Table: ({
    data,
    columns,
  }: {
    data: Array<{ transaction: { tx_id: string } }>;
    columns: Array<{ id: string }>;
  }) => (
    <div data-testid="table" data-columns={columns.map(c => c.id).join(',')}>
      {data.map(row => (
        <span key={row.transaction.tx_id}>{row.transaction.tx_id}</span>
      ))}
    </div>
  ),
}));
jest.mock('@/common/components/ListFooter', () => ({
  ListFooter: ({
    hasNextPage,
    isError,
    fetchNextPage,
  }: {
    hasNextPage?: boolean;
    isError?: boolean;
    fetchNextPage: () => void;
  }) => (
    <button disabled={!hasNextPage} onClick={() => fetchNextPage()}>
      {isError ? 'retry' : 'load-more'}
    </button>
  ),
}));
jest.mock('../../../../../app/_components/ErrorBoundary', () => ({
  ExplorerErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockInfinite = usePrincipalTxSummariesInfinite as jest.MockedFunction<
  typeof usePrincipalTxSummariesInfinite
>;
const mockFilter = useFilterAndSortState as jest.MockedFunction<typeof useFilterAndSortState>;

function summaryItem(tx_id: string, type = 'coinbase') {
  return {
    transaction: {
      tx_id,
      type,
      sender: { address: 'SP1', nonce: 0 },
      fee_rate: '0',
      block: { time: 0 },
      event_count: 0,
      ...(type === 'token_transfer'
        ? { token_transfer: { recipient: 'SP2', amount: '1', memo: null } }
        : {}),
    },
  };
}

function mockInfiniteResponse(overrides: Record<string, unknown> = {}) {
  mockInfinite.mockReturnValue({
    data: {
      pages: [
        { results: [summaryItem('0x01', 'coinbase'), summaryItem('0x02', 'token_transfer')] },
        { results: [summaryItem('0x03', 'coinbase')] },
      ],
    },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePrincipalTxSummariesInfinite>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFilter.mockReturnValue({ activeFilters: [] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
});

test('maps every cursor page item to a table row', () => {
  mockInfiniteResponse();
  render(<AddressTxsTable principal="SP1" />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.getByText('0x03')).toBeInTheDocument();
});

test('load-more triggers the next cursor page', () => {
  const fetchNextPage = jest.fn();
  mockInfiniteResponse({ fetchNextPage });
  render(<AddressTxsTable principal="SP1" />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});

test('applies the active type filter client-side over the fetched rows', () => {
  mockInfiniteResponse();
  mockFilter.mockReturnValue({ activeFilters: ['token_transfer'] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
  render(<AddressTxsTable principal="SP1" />);

  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.queryByText('0x01')).not.toBeInTheDocument();
  expect(screen.queryByText('0x03')).not.toBeInTheDocument();
});

test('only hands first-page failures to the error boundary', () => {
  mockInfiniteResponse();
  render(<AddressTxsTable principal="SP1" />);

  expect(mockInfinite).toHaveBeenCalledWith(
    'SP1',
    expect.objectContaining({ throwOnError: throwOnFirstPageError })
  );
});

test('keeps loaded rows and offers a retry when loading more failed', () => {
  mockInfiniteResponse({ isFetchNextPageError: true });
  render(<AddressTxsTable principal="SP1" />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
});

test('renders custom columns (e.g. the token tab Events column)', () => {
  mockInfiniteResponse();
  render(<AddressTxsTable principal="SP1" columns={[{ id: 'events' }]} />);

  expect(screen.getByTestId('table')).toHaveAttribute('data-columns', 'events');
});
