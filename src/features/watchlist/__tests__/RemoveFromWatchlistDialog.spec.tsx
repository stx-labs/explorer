'use client';

import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RemoveFromWatchlistDialog } from '../RemoveFromWatchlistDialog';

describe('RemoveFromWatchlistDialog', () => {
  it('calls onConfirm and closes when Remove is pressed', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();

    renderWithProviders(
      <RemoveFromWatchlistDialog
        open
        onOpenChange={onOpenChange}
        addressLabel="foo.btc"
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: /^Remove$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes without confirm when Cancel is pressed', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();

    renderWithProviders(
      <RemoveFromWatchlistDialog
        open
        onOpenChange={onOpenChange}
        addressLabel="SPABC…"
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
