import { usePrincipalMempoolTxSummariesInfinite } from '@/common/queries/useMempoolTxSummaries';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AddressMempoolTxsTable } from '../AddressMempoolTxsTable';

jest.mock('@/common/queries/useMempoolTxSummaries', () => ({
  usePrincipalMempoolTxSummariesInfinite: jest.fn(),
}));
jest.mock('@/features/txsFilterAndSort/useFilterAndSortState', () => ({
  useFilterAndSortState: jest.fn(),
}));

// Mock the table shell + footer so the test targets the component's own wiring (mempool summary →
// row mapping, type filter, cursor pagination) rather than the full columnar render tree.
jest.mock('../../Table', () => ({
  Table: ({ data }: { data: Array<{ transaction: { tx_id: string } }> }) => (
    <div>
      {data.map(row => (
        <span key={row.transaction.tx_id}>{row.transaction.tx_id}</span>
      ))}
    </div>
  ),
}));
jest.mock('@/common/components/ListFooter', () => ({
  ListFooter: ({
    hasNextPage,
    fetchNextPage,
  }: {
    hasNextPage?: boolean;
    fetchNextPage: () => void;
  }) => (
    <button disabled={!hasNextPage} onClick={() => fetchNextPage()}>
      load-more
    </button>
  ),
}));
jest.mock('../../../../../app/_components/ErrorBoundary', () => ({
  ExplorerErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockInfinite = usePrincipalMempoolTxSummariesInfinite as jest.MockedFunction<
  typeof usePrincipalMempoolTxSummariesInfinite
>;
const mockFilter = useFilterAndSortState as jest.MockedFunction<typeof useFilterAndSortState>;

// The v3 principal-mempool feed returns flat MempoolTransactionSummary items (unlike the confirmed
// feed, which wraps each in `{ transaction }`).
function summaryItem(tx_id: string, type = 'coinbase') {
  return {
    tx_id,
    type,
    sender: { address: 'SP1', nonce: 0 },
    fee_rate: '0',
    receipt_time: 0,
    ...(type === 'smart_contract' ? { smart_contract: { contract_id: 'SP1.c' } } : {}),
  };
}

function mockResponse(overrides: Record<string, unknown> = {}) {
  mockInfinite.mockReturnValue({
    data: {
      pages: [
        { results: [summaryItem('0x01', 'coinbase'), summaryItem('0x02', 'smart_contract')] },
        { results: [summaryItem('0x03', 'coinbase')] },
      ],
    },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePrincipalMempoolTxSummariesInfinite>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFilter.mockReturnValue({ activeFilters: [] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
});

test('maps every cursor page item to a mempool table row', () => {
  mockResponse();
  render(<AddressMempoolTxsTable principal="SP1" />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.getByText('0x03')).toBeInTheDocument();
});

test('load-more triggers the next cursor page', () => {
  const fetchNextPage = jest.fn();
  mockResponse({ fetchNextPage });
  render(<AddressMempoolTxsTable principal="SP1" />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});

test('applies the active type filter client-side', () => {
  mockResponse();
  mockFilter.mockReturnValue({ activeFilters: ['smart_contract'] } as unknown as ReturnType<
    typeof useFilterAndSortState
  >);
  render(<AddressMempoolTxsTable principal="SP1" />);

  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.queryByText('0x01')).not.toBeInTheDocument();
  expect(screen.queryByText('0x03')).not.toBeInTheDocument();
});
