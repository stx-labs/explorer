import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ChakraProviderWrapper } from '../../../common/utils/test-utils/render-utils';
import { MEMPOOL_TX_TYPE_FILTER_VALUES } from '../../txs-list/utils';
import { FilterButton } from '../FilterButton';
import { useFilterAndSortState } from '../useFilterAndSortState';

jest.mock('../useFilterAndSortState', () => ({ useFilterAndSortState: jest.fn() }));

const setActiveFilters = jest.fn();

// The menu's popper measures its anchor, which jsdom can't.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  jest.clearAllMocks();
  (useFilterAndSortState as jest.Mock).mockReturnValue({ activeFilters: [], setActiveFilters });
});

const openMenu = async (types?: readonly string[]) => {
  render(
    <ChakraProviderWrapper>
      <FilterButton types={types} />
    </ChakraProviderWrapper>
  );
  fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
  return (await screen.findAllByRole('menuitemcheckbox')).map(item => item.textContent);
};

test('offers every tx type by default', async () => {
  expect(await openMenu()).toEqual([
    'Coinbase',
    'Contract deploy',
    'Function call',
    'Tenure change',
    'Token transfer',
  ]);
});

test('offers only the given types', async () => {
  expect(await openMenu(MEMPOOL_TX_TYPE_FILTER_VALUES)).toEqual([
    'Contract deploy',
    'Function call',
    'Token transfer',
  ]);
});
