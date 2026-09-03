import { Column, ColumnDef } from '@tanstack/react-table';
import { screen } from '@testing-library/react';

import { renderWithChakraProviders } from '../../utils/test-utils/render-utils';
import { Table, getColumnPinningState, getCommonPinningStyles } from './Table';

describe('Table', () => {
  it('applies row props by data-row index, independently of structural rows', () => {
    renderWithChakraProviders(
      <Table
        columns={[{ accessorKey: 'name', header: 'Name' }]}
        data={[{ name: 'first' }, { name: 'second' }]}
        getRowProps={(_row, rowIndex) => (rowIndex === 1 ? { 'data-highlighted': 'true' } : {})}
      />
    );

    expect(screen.getByText('first').closest('tr')).not.toHaveAttribute('data-highlighted');
    expect(screen.getByText('second').closest('tr')).toHaveAttribute('data-highlighted', 'true');
  });
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
      bg: 'surface',
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
      bg: 'surface',
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
      bg: 'surface',
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
