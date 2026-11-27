import { useGlobalContext } from '@/common/context/useGlobalContext';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';

import { AddressTabs } from '../AddressTabs';

const mockNftTableMounts = jest.fn();

jest.mock('@/common/context/useGlobalContext', () => ({ useGlobalContext: jest.fn() }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=collectibles'),
  usePathname: () => '/address/SP1OWNER',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('../../AddressIdPageContext', () => ({
  useAddressIdPageData: () => ({
    initialAddressRecentTransactionsData: { total: 0 },
    initialAddressBalancesData: { fungible_tokens: {} },
  }),
}));
jest.mock('@/common/queries/useNftHoldings', () => ({
  useNftHoldings: () => ({ data: { total: 21 } }),
}));
jest.mock('@/common/queries/usePrincipalTxSummaries', () => ({
  usePrincipalTxSummaries: () => ({ data: undefined }),
}));
jest.mock('../NFTTable', () => ({
  NFTTable: () => {
    useEffect(() => mockNftTableMounts(), []);
    return <span>nft-table</span>;
  },
}));
jest.mock('../AddressOverview', () => ({ AddressOverview: () => null }));
jest.mock('../../tx-lists/AddressConfirmedTxs', () => ({ AddressConfirmedTxs: () => null }));
jest.mock('@/common/components/table/table-examples/AddressMempoolTxsTable', () => ({
  AddressMempoolTxsTable: () => null,
}));
jest.mock('@/common/components/table/fungible-tokens-table/FungibleTokensTableWithFilters', () => ({
  FungibleTokensTableWithFilters: () => null,
}));

const mockUseGlobalContext = useGlobalContext as jest.MockedFunction<typeof useGlobalContext>;

function setActiveNetworkKey(activeNetworkKey: string) {
  mockUseGlobalContext.mockReturnValue({ activeNetworkKey } as ReturnType<typeof useGlobalContext>);
}

function tabs(principal: string) {
  return (
    <ChakraProvider value={system}>
      <AddressTabs principal={principal} />
    </ChakraProvider>
  );
}

beforeAll(() => {
  // ScrollIndicator measures the tab list; jsdom has no ResizeObserver.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  jest.clearAllMocks();
  setActiveNetworkKey('https://api.testnet.hiro.so');
});

test('remounts the NFT table, resetting its cursors, when the API or principal changes', () => {
  const { rerender } = render(tabs('ST1OWNER'));
  expect(screen.getByText('nft-table')).toBeInTheDocument();
  expect(mockNftTableMounts).toHaveBeenCalledTimes(1);

  rerender(tabs('ST1OWNER'));
  expect(mockNftTableMounts).toHaveBeenCalledTimes(1);

  setActiveNetworkKey('http://localhost:3999');
  rerender(tabs('ST1OWNER'));
  expect(mockNftTableMounts).toHaveBeenCalledTimes(2);

  rerender(tabs('ST2OTHER'));
  expect(mockNftTableMounts).toHaveBeenCalledTimes(3);
});
