import {
  usePrincipalTxSummaries,
  usePrincipalTxSummariesInfinite,
} from '@/common/queries/usePrincipalTxSummaries';
import { TransactionSummary } from '@/common/types/tx-v3';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';

import { AddressTxsTable } from '../AddressTxsTable';

jest.mock('@/common/queries/usePrincipalTxSummaries', () => ({
  usePrincipalTxSummaries: jest.fn(),
  usePrincipalTxSummariesInfinite: jest.fn(),
}));

// Render the leaf pieces as simple stand-ins so the test targets AddressTxsTable's own
// wiring (summary mapping, recent vs paginated path, footer gating) rather than the full tx tree.
jest.mock('@/features/txs-list/v3/FilteredTxSummaries', () => ({
  FilteredTxSummaries: ({ txs }: { txs: TransactionSummary[] }) => (
    <div>
      {txs.map(tx => (
        <span key={tx.tx_id}>{tx.tx_id}</span>
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
jest.mock('@/common/components/loaders/skeleton-transaction', () => ({
  SkeletonGenericTransactionList: () => <div>loading-skeleton</div>,
}));
jest.mock('../../../../../app/_components/ErrorBoundary', () => ({
  ExplorerErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockInfinite = usePrincipalTxSummariesInfinite as jest.MockedFunction<
  typeof usePrincipalTxSummariesInfinite
>;
const mockSingle = usePrincipalTxSummaries as jest.MockedFunction<typeof usePrincipalTxSummaries>;

function summaryItem(tx_id: string) {
  return { transaction: { tx_id, type: 'token_transfer', event_count: 0 } as TransactionSummary };
}

function mockInfiniteResponse(overrides: Record<string, unknown> = {}) {
  mockInfinite.mockReturnValue({
    data: {
      pages: [
        { results: [summaryItem('0x01'), summaryItem('0x02')] },
        { results: [summaryItem('0x03')] },
      ],
    },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePrincipalTxSummariesInfinite>);
}

function mockSingleResponse(overrides: Record<string, unknown> = {}) {
  mockSingle.mockReturnValue({
    data: { results: [summaryItem('0x01'), summaryItem('0x02')] },
    isLoading: false,
    ...overrides,
  } as unknown as ReturnType<typeof usePrincipalTxSummaries>);
}

function renderWithChakra(ui: ReactElement) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

beforeEach(() => jest.clearAllMocks());

test('shows the skeleton while the first page loads', () => {
  mockInfiniteResponse({ isLoading: true, data: undefined });
  renderWithChakra(<AddressTxsTable principal="SP1" pageSize={10} />);
  expect(screen.getByText('loading-skeleton')).toBeInTheDocument();
});

test('maps every page item to its transaction summary and shows the load-more footer', () => {
  mockInfiniteResponse();
  renderWithChakra(<AddressTxsTable principal="SP1" pageSize={10} />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.getByText('0x03')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'load-more' })).toBeEnabled();
});

test('load-more triggers the next cursor page', () => {
  const fetchNextPage = jest.fn();
  mockInfiniteResponse({ fetchNextPage });
  renderWithChakra(<AddressTxsTable principal="SP1" pageSize={10} />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});

test('disablePagination renders the recent single page without a footer', () => {
  mockSingleResponse();
  renderWithChakra(<AddressTxsTable principal="SP1" pageSize={3} disablePagination />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'load-more' })).not.toBeInTheDocument();
  expect(mockInfinite).not.toHaveBeenCalled();
});

test('disablePagination seeds the single-page query from the SSR initial data', () => {
  mockSingleResponse();
  const initialData = {
    total: 1,
    limit: 3,
    cursor: { next: null, previous: null, current: null },
    results: [summaryItem('0x01')],
  };
  renderWithChakra(
    <AddressTxsTable
      principal="SP1"
      pageSize={3}
      disablePagination
      initialData={initialData as never}
    />
  );

  expect(mockSingle).toHaveBeenCalledWith('SP1', 3, expect.objectContaining({ initialData }));
});
