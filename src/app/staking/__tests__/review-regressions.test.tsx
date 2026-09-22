import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AnnotatedValue } from '../AnnotatedValue';
import { BondsTable } from '../BondsTable';
import bondFixture from './fixtures/bond.json';

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

test('value annotations have a named, keyboard-accessible help trigger', async () => {
  const user = userEvent.setup();
  const note = 'Complete reward allocation history is unavailable.';
  renderWithChakraProviders(<AnnotatedValue value="N/A" note={note} />);

  const trigger = screen.getByRole('button', { name: note });
  await user.tab();
  expect(trigger).toHaveFocus();
  expect(await screen.findByRole('tooltip')).toHaveTextContent(note);
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
});

test('bond pagination reaches every row, including the short final page, and resets on data changes', async () => {
  const user = userEvent.setup();
  const bonds = Array.from({ length: 5 }, (_, i) => ({ ...bondFixture, index: i + 1 }));
  const props = { bonds, currentBurnHeight: 9508, nowMs: Date.UTC(2026, 7, 25), pageSize: 2 };
  const { rerender } = renderWithChakraProviders(<BondsTable {...props} />);

  expect(screen.getByText('Bond 5')).toBeInTheDocument();
  expect(screen.getByText('Bond 4')).toBeInTheDocument();
  expect(screen.queryByText('Bond 3')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(await screen.findByText('Bond 3')).toBeInTheDocument();
  expect(screen.getByText('Bond 2')).toBeInTheDocument();
  expect(screen.queryByText('Bond 5')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(await screen.findByText('Genesis')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();

  await act(async () => rerender(<BondsTable {...props} bonds={bonds.slice(3)} />));
  expect(screen.getByText('Bond 5')).toBeInTheDocument();
  expect(screen.getByText('Bond 4')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Go to next page' })).not.toBeInTheDocument();
});
