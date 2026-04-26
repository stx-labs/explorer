'use client';

import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

export type RemoveFromWatchlistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** BNS name or principal string shown in the message body */
  addressLabel: string;
  onConfirm: () => void;
};

/** Shared confirmation dialog before removing an address from the watchlist. */
export function RemoveFromWatchlistDialog({
  open,
  onOpenChange,
  addressLabel,
  onConfirm,
}: RemoveFromWatchlistDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={e => onOpenChange(e.open)} placement="center">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove from watchlist?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Text textStyle="text-regular-sm" color="textPrimary">
            Удалить{' '}
            <Text as="span" fontWeight="semibold">
              {addressLabel}
            </Text>{' '}
            из избранного?
          </Text>
        </DialogBody>
        <DialogFooter gap={3}>
          <Button variant="redesignTertiary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="redesignPrimary"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
