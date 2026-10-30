import { usePrincipalTxSummaries } from '@/common/queries/usePrincipalTxSummaries';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AddressRecentTxsTable } from '../AddressRecentTxsTable';

jest.mock('@/common/queries/usePrincipalTxSummaries', () => ({
  usePrincipalTxSummaries: jest.fn(),
}));

// Mock the table shell so the test targets AddressRecentTxsTable's own wiring (single-page query,
// summary → row mapping, SSR seed) rather than the full columnar render tree.
jest.mock('../../Table', () => ({
  Table: ({ data }: { data: Array<{ transaction: { tx_id: string } }> }) => (
    <div>
      {data.map(row => (
        <span key={row.transaction.tx_id}>{row.transaction.tx_id}</span>
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
    },
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

beforeEach(() => jest.clearAllMocks());

test('renders a row per recent transaction summary', () => {
  mockResponse();
  render(<AddressRecentTxsTable principal="SP1" pageSize={3} />);

  expect(screen.getByText('0x01')).toBeInTheDocument();
  expect(screen.getByText('0x02')).toBeInTheDocument();
});

test('requests the single page at the given size and seeds it from the SSR initial data', () => {
  mockResponse();
  const initialData = {
    total: 1,
    limit: 3,
    cursor: { next: null, previous: null, current: null },
    results: [summaryItem('0x01')],
  };
  render(<AddressRecentTxsTable principal="SP1" pageSize={3} initialData={initialData as never} />);

  expect(mockSingle).toHaveBeenCalledWith('SP1', 3, expect.objectContaining({ initialData }));
});
