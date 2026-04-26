'use client';

import type { DragEvent } from 'react';

import { Tooltip } from '@/ui/Tooltip';
import { Icon } from '@chakra-ui/react';
import { DotsSixVertical } from '@phosphor-icons/react';

export type WatchlistDragHandleProps = {
  rowIndex: number;
  active: boolean;
  onDragStart: (e: DragEvent, rowIndex: number) => void;
  onDragEnd: () => void;
};

export function WatchlistDragHandle({ rowIndex, active, onDragStart, onDragEnd }: WatchlistDragHandleProps) {
  if (!active) {
    return (
      <Tooltip content="Sorting or search is on — drag to reorder is only available with default list order and no search">
        <span style={{ display: 'inline-flex', opacity: 0.35, cursor: 'not-allowed' }} aria-hidden>
          <Icon h={4} w={4} color="iconSecondary">
            <DotsSixVertical />
          </Icon>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Drag to reorder">
      <span
        draggable
        onDragStart={e => onDragStart(e, rowIndex)}
        onDragEnd={onDragEnd}
        style={{ cursor: 'grab', display: 'inline-flex' }}
        aria-label="Reorder watchlist row"
      >
        <Icon h={4} w={4} color="iconSecondary">
          <DotsSixVertical />
        </Icon>
      </span>
    </Tooltip>
  );
}
