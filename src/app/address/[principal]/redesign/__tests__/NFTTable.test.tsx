import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Cl, cvToHex } from '@stacks/transactions';

import { useAddressIdPageData } from '../../AddressIdPageContext';
import { NFTTable } from '../NFTTable';

jest.mock('@/common/queries/useNftHoldings', () => ({ useNftHoldings: jest.fn() }));
jest.mock('@/common/queries/useBulkTokenMetadata', () => ({
  useBulkFtMetadata: () => ({ metadataMap: new Map() }),
}));
jest.mock('../../AddressIdPageContext', () => ({ useAddressIdPageData: jest.fn() }));
jest.mock('../CollectibleCard', () => ({
  CollectibleCard: ({ assetId, tokenId }: { assetId: string; tokenId: bigint | string }) => (
    <span>{`${assetId}#${tokenId}`}</span>
  ),
}));

const mockUseNftHoldings = useNftHoldings as jest.MockedFunction<typeof useNftHoldings>;
const mockUseAddressIdPageData = useAddressIdPageData as jest.MockedFunction<
  typeof useAddressIdPageData
>;

const ASSET_ID = 'SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild::The-Explorer-Guild';
const PAGE_SIZE = 10;

// Three pages linked by `cursor.next`; page n holds token ids n*10+1..n*10+10 (the last one has 1).
type Page = { tokenIds: number[]; next: string | null };
const DEFAULT_PAGES: Record<string, Page> = {
  first: { tokenIds: Array.from({ length: PAGE_SIZE }, (_, i) => i + 1), next: 'cursor-2' },
  'cursor-2': { tokenIds: Array.from({ length: PAGE_SIZE }, (_, i) => i + 11), next: 'cursor-3' },
  'cursor-3': { tokenIds: [21], next: null },
};

function setPrincipal(principal: string) {
  mockUseAddressIdPageData.mockReturnValue({ principal } as ReturnType<
    typeof useAddressIdPageData
  >);
}

let PAGES: Record<string, Page>;
let TOTAL: number;

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  setPrincipal('SP1OWNER');
  PAGES = { ...DEFAULT_PAGES };
  TOTAL = 21;
  mockUseNftHoldings.mockImplementation((_principal, limit, cursor) => {
    const page = PAGES[cursor ?? 'first'];
    return {
      data: {
        limit,
        total: TOTAL,
        cursor: { next: page.next, previous: null, current: cursor ?? null },
        results: page.tokenIds.map(id => ({
          asset_identifier: ASSET_ID,
          value: { hex: cvToHex(Cl.uint(id)), repr: `u${id}` },
        })),
      },
    } as unknown as ReturnType<typeof useNftHoldings>;
  });
});

const table = (
  <ChakraProvider value={system}>
    <NFTTable />
  </ChakraProvider>
);
let view: ReturnType<typeof render>;

function renderTable() {
  view = render(table);
  return view;
}

// Re-render with whatever the mocked query now returns, like a background refetch would.
function rerenderTable() {
  view.rerender(
    <ChakraProvider value={system}>
      <NFTTable />
    </ChakraProvider>
  );
}

test('pages through NFT holdings with v3 cursors and shows previous/next only', async () => {
  renderTable();

  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, undefined);
  expect(screen.getByText(`${ASSET_ID}#1`)).toBeInTheDocument();
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  expect(screen.queryByLabelText('Go to page number')).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, 'cursor-2');
  expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#21`)).toBeInTheDocument();
  expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();

  // Going back reuses the cursor already learned for page 2.
  fireEvent.click(screen.getByLabelText('Go to previous page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, 'cursor-2');
});

test('steps forward with the current page cursor, not one stored before a refetch', async () => {
  renderTable();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Go to previous page'));
  expect(await screen.findByText(`${ASSET_ID}#1`)).toBeInTheDocument();

  // Page 1 refetched with a newly received NFT, so page 2 now starts at a different position.
  PAGES = {
    ...PAGES,
    first: { ...PAGES.first, next: 'cursor-2b' },
    'cursor-2b': PAGES['cursor-2'],
  };
  rerenderTable();
  mockUseNftHoldings.mockClear();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  await waitFor(() =>
    expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, 'cursor-2b')
  );
});

test('disables next when the page has no next cursor, even if the total implies more', async () => {
  PAGES = { ...PAGES, 'cursor-2': { ...PAGES['cursor-2'], next: null } };
  renderTable();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(screen.getByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, 'cursor-2');
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
});

test('allows next when the page has a next cursor, even if the total implies no more', async () => {
  TOTAL = PAGE_SIZE;
  renderTable();

  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();
  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP1OWNER', PAGE_SIZE, 'cursor-2');
});

test('keeps the pager on a later page when the total shrinks', async () => {
  renderTable();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();

  TOTAL = 5;
  PAGES = { ...PAGES, 'cursor-2': { tokenIds: [11], next: null } };
  rerenderTable();

  expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Go to previous page'));
  expect(await screen.findByText(`${ASSET_ID}#1`)).toBeInTheDocument();
});

test('shows an error with a retry instead of an empty grid when the request fails', () => {
  const refetch = jest.fn();
  mockUseNftHoldings.mockReturnValue({
    data: undefined,
    isError: true,
    refetch,
  } as unknown as ReturnType<typeof useNftHoldings>);
  renderTable();

  expect(screen.getByText('Failed to load collectibles.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
