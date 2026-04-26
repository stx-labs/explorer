'use client';

import { act, renderHook } from '@testing-library/react';
import type { DragEvent } from 'react';

import { useWatchlistHtml5RowReorder } from '../hooks/useWatchlistDragAndDrop';

function mockDragEvent(getData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...getData };
  return {
    dataTransfer: {
      setData: jest.fn((k: string, v: string) => {
        store[k] = v;
      }),
      getData: jest.fn((k: string) => store[k] ?? ''),
      dropEffect: '',
      effectAllowed: '',
    },
    preventDefault: jest.fn(),
  } as unknown as DragEvent;
}

describe('useWatchlistHtml5RowReorder', () => {
  it('no-ops drag handlers when inactive', () => {
    const { result } = renderHook(() => useWatchlistHtml5RowReorder(false));
    const ev = mockDragEvent();
    act(() => {
      result.current.handleDragStart(ev, 2);
    });
    expect(result.current.dragSourceIndex).toBeNull();
  });

  it('sets source index on drag start when active', () => {
    const { result } = renderHook(() => useWatchlistHtml5RowReorder(true));
    const ev = mockDragEvent();
    act(() => {
      result.current.handleDragStart(ev, 3);
    });
    expect(ev.dataTransfer.setData).toHaveBeenCalled();
    expect(result.current.dragSourceIndex).toBe(3);
  });

  it('calls onMove and clears state on drop', () => {
    const { result } = renderHook(() => useWatchlistHtml5RowReorder(true));
    const onMove = jest.fn();
    const start = mockDragEvent();
    act(() => {
      result.current.handleDragStart(start, 1);
    });
    const drop = mockDragEvent({ 'application/x-watchlist-row-index': '1' });
    act(() => {
      result.current.handleDrop(drop, 4, onMove);
    });
    expect(drop.preventDefault).toHaveBeenCalled();
    expect(onMove).toHaveBeenCalledWith(1, 4);
    expect(result.current.dragSourceIndex).toBeNull();
  });

  it('does not call onMove when dropping on same index', () => {
    const { result } = renderHook(() => useWatchlistHtml5RowReorder(true));
    const onMove = jest.fn();
    const ev = mockDragEvent({ 'application/x-watchlist-row-index': '2' });
    act(() => {
      result.current.handleDrop(ev, 2, onMove);
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('clears on drag end', () => {
    const { result } = renderHook(() => useWatchlistHtml5RowReorder(true));
    const ev = mockDragEvent();
    act(() => {
      result.current.handleDragStart(ev, 0);
    });
    act(() => {
      result.current.handleDragEnd();
    });
    expect(result.current.dragSourceIndex).toBeNull();
  });
});
