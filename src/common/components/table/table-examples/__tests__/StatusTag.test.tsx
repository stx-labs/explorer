import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ChakraProviderWrapper } from '../../../../utils/test-utils/render-utils';
import { StatusTag } from '../TxTableCellRenderers';

// Four independent switch statements map each status; a status added to only some of them falls
// through to `default` and renders the raw enum as the tag's accessible name.
describe('StatusTag', () => {
  it.each([
    ['pending', 'Pending'],
    ['abort_by_post_condition', 'Failed'],
    ['abort_by_response', 'Failed'],
    ['problematic_skipped', 'Failed'],
  ])('labels %s as %s', (status, label) => {
    render(<StatusTag status={status as any} />, { wrapper: ChakraProviderWrapper });
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', `Transaction status: ${label}`);
  });
});
