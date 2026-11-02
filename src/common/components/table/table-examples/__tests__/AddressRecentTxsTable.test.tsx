import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import { usePrincipalTxSummaries } from '@/common/queries/usePrincipalTxSummaries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AddressRecentTxsTable } from '../AddressRecentTxsTable';

jest.mock('@/common/queries/usePrincipalTxSummaries', () => ({
  ...jest.requireActual('@/common/queries/usePrincipalTxSummaries'),
  usePrincipalTxSummaries: jest.fn(),
}));
jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => ({ activeNetwork: { networkId: 1 } }),
}));

// Mock the table shell so the test targets AddressRecentTxsTable's own wiring (single-page query,
// summary → row mapping, SSR seed) rather than the full columnar render tree.
jest.mock('../../Table', () => ({
  Table: ({ data }: { data: Array<{ tx: { tx_id: string } }> }) => (
    <div>
      {data.map(row => (
        <span key={row.tx.tx_id}>{row.tx.tx_id}</span>
      ))}
    </div>
  ),
}));
jest.mock('@/app/_components/ErrorBoundary', () => ({
  ExplorerErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockSingle = usePrincipalTxSummaries as jest.MockedFunction<typeof usePrincipalTxSummaries>;

function summaryItem(tx_id: string) {
  return {
    transaction: {
      tx_id,
      type: 'coinbase',
      sender: { address: 'SP1', nonce: 0 },
      fee_rate: '0',
      block: { time: 0 },
      event_count: 0,
      sponsor: null,
    },
    involvement: 'sender',
    balance_changes: { stx: { sent: '0', received: '0', net: '0' } },
  };
}

function mockResponse(overrides: Record<string, unknown> = {}) {
  mockSingle.mockReturnValue({
    data: { results: [summaryItem('0x01'), summaryItem('0x02')] },
    isLoading: false,
    isFetching: false,
    ...overrides,
  } as unknown as ReturnType<typeof usePrincipalTxSummaries>);
}

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient();
});

test('renders a row per recent transaction summary', () => {
  mockResponse();
  render(<AddressRecentTxsTable principal="SP1" pageSize={3} />, { wrapper });

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
});

test('seeds the query cache from the SSR initial data instead of passing initialData', () => {
  mockResponse();
  const initialData = {
    total: 1,
    limit: 3,
    cursor: { next: null, previous: null, current: null },
    results: [summaryItem('0x01')],
  };
  render(
    <AddressRecentTxsTable principal="SP1" pageSize={3} initialData={initialData as never} />,
    {
      wrapper,
    }
  );

  expect(queryClient.getQueryData(['principalTxSummaries', 1, 'SP1', 3])).toBe(initialData);
  const [, , options] = mockSingle.mock.calls[0];
  expect(options).not.toHaveProperty('initialData');
  expect(options).toEqual(expect.objectContaining({ throwOnError: throwOnFirstPageError }));
});
