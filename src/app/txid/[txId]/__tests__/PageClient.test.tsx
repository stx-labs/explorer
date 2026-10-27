import { useApiClient } from '@/api/useApiClient';
import { TxDetails } from '@/common/types/tx-v3';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import TransactionIdPage from '../PageClient';
import { TxIdPageDataProvider } from '../TxIdPageContext';

jest.mock('@/api/useApiClient');
jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => ({ activeNetwork: { url: mockActiveApiUrl } }),
}));
jest.mock('@/common/components/table/tx-table/useTxTableFilters', () => ({
  TxTableFiltersProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock('../redesign/TokenTransferPage', () => ({
  TokenTransferPage: ({ tx }: { tx: TxDetails }) => <div>status: {tx.status}</div>,
}));

const TX_ID = '0x44c64a8975bdd4b2f6eef4b0d1ac1203ce6f67fe0e4490289495727de8f311f3';
const transfer = {
  recipient: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
  amount: '1',
  memo: null,
};
const pendingTx = {
  tx_id: TX_ID,
  type: 'token_transfer',
  status: 'pending',
  receipt_time: 1700000000,
  token_transfer: transfer,
} as unknown as TxDetails;
const minedTx = {
  tx_id: TX_ID,
  type: 'token_transfer',
  status: 'success',
  block: { height: 100, hash: '0xblock', index_hash: '0xindex', time: 1700000100, tx_index: 0 },
  bitcoin_block: { height: 800, hash: '0xbtc', time: 1700000000 },
  token_transfer: transfer,
} as unknown as TxDetails;

const mockClient = { GET: jest.fn() };
let mockActiveApiUrl = 'https://api.hiro.so';

const ok = (data: TxDetails) => ({ data, error: undefined });
const failure = (status: number) => ({
  data: undefined,
  error: { error: `HTTP ${status}` },
  response: { status },
});

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(initialTxData: TxDetails | undefined, queryClient = newQueryClient()) {
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <TxIdPageDataProvider
          txId={TX_ID}
          initialTxData={initialTxData}
          filters={{
            fromAddress: '',
            toAddress: '',
            startTime: '',
            endTime: '',
            transactionType: [],
          }}
        >
          <TransactionIdPage />
        </TxIdPageDataProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockActiveApiUrl = 'https://api.hiro.so';
  mockClient.GET.mockReset();
  jest.mocked(useApiClient).mockReturnValue(mockClient as never);
});

afterEach(() => {
  jest.useRealTimers();
});

test('re-reads a pending transaction until it is mined, without a reload', async () => {
  mockClient.GET.mockResolvedValueOnce({ data: pendingTx, error: undefined }).mockResolvedValue({
    data: minedTx,
    error: undefined,
  });
  renderPage(pendingTx);

  expect(screen.getByText('status: pending')).toBeInTheDocument();
  // The server-rendered transaction is used as is; nothing is fetched on mount.
  expect(mockClient.GET).not.toHaveBeenCalled();

  await advance(10_000);
  expect(screen.getByText('status: pending')).toBeInTheDocument();
  await advance(10_000);
  expect(await screen.findByText('status: success')).toBeInTheDocument();
  expect(mockClient.GET).toHaveBeenCalledTimes(2);
  expect(mockClient.GET).toHaveBeenLastCalledWith('/extended/v3/transactions/{tx_id}', {
    params: {
      path: { tx_id: TX_ID },
      query: { include: ['function_args', 'post_conditions', 'result'] },
    },
  });

  // Mined transactions are final, so polling stops.
  await advance(60_000);
  expect(mockClient.GET).toHaveBeenCalledTimes(2);
});

test('never re-reads a transaction that was already mined', async () => {
  renderPage(minedTx);

  await advance(60_000);
  expect(screen.getByText('status: success')).toBeInTheDocument();
  expect(mockClient.GET).not.toHaveBeenCalled();
});

test('keeps the last known transaction and stops polling once the transaction is gone', async () => {
  mockClient.GET.mockResolvedValue(failure(404));
  renderPage(pendingTx);

  await advance(10_000);
  expect(screen.getByText('status: pending')).toBeInTheDocument();
  await advance(60_000);
  expect(mockClient.GET).toHaveBeenCalledTimes(1);
});

test('keeps polling through transient failures until the transaction is mined', async () => {
  mockClient.GET.mockResolvedValueOnce(failure(503))
    .mockResolvedValueOnce(failure(429))
    .mockResolvedValue(ok(minedTx));
  renderPage(pendingTx);

  await advance(10_000);
  await advance(10_000);
  expect(screen.getByText('status: pending')).toBeInTheDocument();
  await advance(10_000);
  expect(await screen.findByText('status: success')).toBeInTheDocument();
  expect(mockClient.GET).toHaveBeenCalledTimes(3);
});

test('keeps a transaction loaded in the browser when a later re-read fails', async () => {
  // Server rendering disabled or failed: the page loads the transaction itself.
  mockClient.GET.mockResolvedValueOnce(ok(pendingTx)).mockResolvedValue(failure(404));
  renderPage(undefined);

  expect(await screen.findByText('status: pending')).toBeInTheDocument();
  await advance(10_000);
  expect(mockClient.GET).toHaveBeenCalledTimes(2);
  expect(screen.getByText('status: pending')).toBeInTheDocument();
  expect(screen.queryByText('Failed to load transaction')).not.toBeInTheDocument();
});

test('shows the server result for another API instead of the previous API cached copy', async () => {
  const queryClient = newQueryClient();
  const first = renderPage(minedTx, queryClient);
  expect(screen.getByText('status: success')).toBeInTheDocument();
  first.unmount();

  // Same transaction ID through a different API (e.g. `?api=`), with the cache still populated.
  mockActiveApiUrl = 'https://api.example.test';
  renderPage(pendingTx, queryClient);

  expect(screen.getByText('status: pending')).toBeInTheDocument();
});
