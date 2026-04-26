'use client';

import { Table } from '@chakra-ui/react';
import type { DragEvent, ReactNode } from 'react';

export type WatchlistDraggableRowProps = {
  children: ReactNode;
  rowIndex: number;
  dndEnabled: boolean;
  dragSourceIndex: number | null;
  dropTargetIndex: number | null;
  onDragOver: (e: DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, index: number) => void;
  onDragEnd: () => void;
};

export function WatchlistDraggableRow({
  children,
  rowIndex,
  dndEnabled,
  dragSourceIndex,
  dropTargetIndex,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: WatchlistDraggableRowProps) {
  return (
    <Table.Row
      onDragOver={dndEnabled ? e => onDragOver(e, rowIndex) : undefined}
      onDragLeave={dndEnabled ? onDragLeave : undefined}
      onDrop={dndEnabled ? e => onDrop(e, rowIndex) : undefined}
      onDragEnd={dndEnabled ? onDragEnd : undefined}
      bg={dndEnabled && dropTargetIndex === rowIndex ? 'surfaceFifth' : undefined}
      opacity={dndEnabled && dragSourceIndex === rowIndex ? 0.55 : 1}
    >
      {children}
    </Table.Row>
  );
}
