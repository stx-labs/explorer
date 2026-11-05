import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

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
const PAGES: Record<string, { tokenIds: number[]; next: string | null }> = {
  first: { tokenIds: Array.from({ length: PAGE_SIZE }, (_, i) => i + 1), next: 'cursor-2' },
  'cursor-2': { tokenIds: Array.from({ length: PAGE_SIZE }, (_, i) => i + 11), next: 'cursor-3' },
  'cursor-3': { tokenIds: [21], next: null },
};

function setPrincipal(principal: string) {
  mockUseAddressIdPageData.mockReturnValue({ principal } as ReturnType<
    typeof useAddressIdPageData
  >);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  setPrincipal('SP1OWNER');
  mockUseNftHoldings.mockImplementation((_principal, limit, cursor) => {
    const page = PAGES[cursor ?? 'first'];
    return {
      data: {
        limit,
        total: 21,
        cursor: { next: page.next, previous: null, current: cursor ?? null },
        results: page.tokenIds.map(id => ({
          asset_identifier: ASSET_ID,
          value: { hex: cvToHex(Cl.uint(id)), repr: `u${id}` },
        })),
      },
    } as unknown as ReturnType<typeof useNftHoldings>;
  });
});

function renderTable() {
  return render(
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

test('restarts from the first page when the principal changes', async () => {
  const { rerender } = renderTable();

  fireEvent.click(screen.getByLabelText('Go to next page'));
  expect(await screen.findByText(`${ASSET_ID}#11`)).toBeInTheDocument();

  setPrincipal('SP2OTHER');
  rerender(
    <ChakraProvider value={system}>
      <NFTTable />
    </ChakraProvider>
  );

  expect(await screen.findByText(`${ASSET_ID}#1`)).toBeInTheDocument();
  expect(mockUseNftHoldings).toHaveBeenLastCalledWith('SP2OTHER', PAGE_SIZE, undefined);
  expect(mockUseNftHoldings).not.toHaveBeenCalledWith('SP2OTHER', PAGE_SIZE, 'cursor-2');
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
});
