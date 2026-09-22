import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { Column, ColumnDef } from '@tanstack/react-table';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Table, getColumnPinningState, getCommonPinningStyles } from './Table';

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  (globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

test.each([
  { header: 'Amount', name: 'About Amount' },
  { header: () => 'Amount', name: 'About amount' },
])('header help "$name" opens outside the table without sorting', async ({ header, name }) => {
  const user = userEvent.setup();
  const onSort = jest.fn(async () => [{ amount: 1 }]);
  const { container } = renderWithChakraProviders(
    <Table
      data={[{ amount: 1 }]}
      columns={[{ accessorKey: 'amount', header, meta: { tooltip: 'Amount in BTC.' } }]}
      onSort={onSort}
    />
  );
  const trigger = screen.getByRole('button', { name });
  await user.tab();
  expect(trigger).toHaveFocus();
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip).toHaveTextContent('Amount in BTC.');
  expect(container).not.toContainElement(tooltip);
  await user.keyboard('{Enter}');
  expect(onSort).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  await user.click(screen.getByText('Amount', { exact: true }));
  expect(onSort).toHaveBeenCalledWith('amount', 'desc');
});

describe('getCommonPinningStyles', () => {
  const createMockColumn = (isPinned: 'left' | 'right' | false, isLastColumn: boolean = false) => {
    return {
      getIsPinned: () => isPinned,
      getIsLastColumn: (side: string) => isLastColumn && side === 'left',
      getStart: (side: string) => 100,
      getAfter: (side: string) => 200,
    } as unknown as Column<any>;
  };

  it('returns empty object when column is not pinned', () => {
    const column = createMockColumn(false);
    const styles = getCommonPinningStyles(column);
    expect(styles).toEqual({});
  });

  it('returns correct styles for left pinned column', () => {
    const column = createMockColumn('left');
    const styles = getCommonPinningStyles(column);

    expect(styles).toEqual({
      bg: 'surfaceTertiary',
      left: '100px',
      right: undefined,
      opacity: 1,
      position: 'sticky',
      zIndex: 1,
    });
  });

  it('returns correct styles for right pinned column', () => {
    const column = createMockColumn('right');
    const styles = getCommonPinningStyles(column);

    expect(styles).toEqual({
      bg: 'surfaceTertiary',
      left: undefined,
      right: '200px',
      opacity: 1,
      position: 'sticky',
      zIndex: 1,
    });
  });

  it('includes additional styles for last left pinned column', () => {
    const column = createMockColumn('left', true);
    const styles = getCommonPinningStyles(column);

    expect(styles).toEqual({
      bg: 'surfaceTertiary',
      left: '100px',
      right: undefined,
      opacity: 1,
      position: 'sticky',
      zIndex: 1,
      '&::before': {
        content: '""',
        position: 'absolute',
        right: 0,
        top: 0,
        width: '2px',
        height: 'full',
        backgroundColor: 'redesignBorderPrimary',
      },
      'td&:first-of-type::before': {
        content: '""',
        position: 'absolute',
        right: 0,
        top: '-8px',
        width: '2px',
        height: 'calc(100% + 8px)',
        backgroundColor: 'redesignBorderPrimary',
      },
    });
  });
});

describe('getColumnPinningState', () => {
  it('returns empty arrays when no columns are pinned', () => {
    const columns: ColumnDef<any>[] = [
      {
        id: 'col1',
        header: 'Column 1',
      },
      {
        id: 'col2',
        header: 'Column 2',
      },
    ];

    const pinningState = getColumnPinningState(columns);
    expect(pinningState).toEqual({ left: [], right: [] });
  });

  it('correctly identifies left and right pinned columns', () => {
    const columns: ColumnDef<any>[] = [
      {
        id: 'col1',
        header: 'Column 1',
        meta: { isPinned: 'left' },
      },
      {
        id: 'col2',
        header: 'Column 2',
      },
      {
        id: 'col3',
        header: 'Column 3',
        meta: { isPinned: 'right' },
      },
      {
        id: 'col4',
        header: 'Column 4',
        meta: { isPinned: 'left' },
      },
    ];

    const pinningState = getColumnPinningState(columns);
    expect(pinningState).toEqual({
      left: ['col1', 'col4'],
      right: ['col3'],
    });
  });

  it('skips columns without IDs', () => {
    const columns: ColumnDef<any>[] = [
      {
        header: 'Column 1',
        meta: { isPinned: 'left' },
      },
      {
        id: 'col2',
        header: 'Column 2',
        meta: { isPinned: 'right' },
      },
    ];

    const pinningState = getColumnPinningState(columns);
    expect(pinningState).toEqual({
      left: [],
      right: ['col2'],
    });
  });

  it('handles columns with undefined meta or isPinned properties', () => {
    const columns: ColumnDef<any>[] = [
      {
        id: 'col1',
        header: 'Column 1',
        meta: undefined,
      },
      {
        id: 'col2',
        header: 'Column 2',
        meta: { isPinned: undefined },
      },
      {
        id: 'col3',
        header: 'Column 3',
        meta: { isPinned: 'left' },
      },
    ];

    const pinningState = getColumnPinningState(columns);
    expect(pinningState).toEqual({
      left: ['col3'],
      right: [],
    });
  });
});
