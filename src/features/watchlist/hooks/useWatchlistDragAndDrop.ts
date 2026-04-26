'use client';

import type { DragEvent } from 'react';
import { useCallback, useState } from 'react';

const ROW_INDEX_MIME = 'application/x-watchlist-row-index';

export function useWatchlistHtml5RowReorder(active: boolean) {
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const clear = useCallback(() => {
    setDragSourceIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragStart = useCallback(
    (event: DragEvent, rowIndex: number) => {
      if (!active) return;
      event.dataTransfer.setData(ROW_INDEX_MIME, String(rowIndex));
      event.dataTransfer.effectAllowed = 'move';
      setDragSourceIndex(rowIndex);
    },
    [active]
  );

  const handleDragOver = useCallback(
    (event: DragEvent, rowIndex: number) => {
      if (!active) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropTargetIndex(rowIndex);
    },
    [active]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent, rowIndex: number, onMove: (from: number, to: number) => void) => {
      if (!active) return;
      event.preventDefault();
      const raw = event.dataTransfer.getData(ROW_INDEX_MIME);
      const from = Number(raw);
      if (!Number.isFinite(from)) {
        clear();
        return;
      }
      if (from !== rowIndex) {
        onMove(from, rowIndex);
      }
      clear();
    },
    [active, clear]
  );

  const handleDragEnd = useCallback(() => {
    clear();
  }, [clear]);

  return {
    dragSourceIndex,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
