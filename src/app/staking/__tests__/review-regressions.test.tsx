import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AnnotatedValue } from '../AnnotatedValue';
import { BondsTable } from '../BondsTable';
import { CurrentBond } from '../CurrentBond';
import { StakingStats } from '../StakingStats';
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

test('a server-paginated bond table displays the supplied page without slicing it again', async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();
  renderWithChakraProviders(
    <BondsTable
      bonds={[
        { ...bondFixture, index: 3 },
        { ...bondFixture, index: 2 },
      ]}
      currentBurnHeight={9508}
      nowMs={Date.UTC(2026, 7, 25)}
      serverPagination={{ pageIndex: 1, pageSize: 2, totalRows: 5, onPageChange }}
    />
  );
  expect(screen.getByText('Bond 3')).toBeInTheDocument();
  expect(screen.getByText('Bond 2')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  await waitFor(() => expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 2 }));
});

test('featured-bond cards preserve missing balances rather than showing zero or crashing', () => {
  renderWithChakraProviders(
    <StakingStats
      featuredBond={{
        ...bondFixture,
        balances: { ...bondFixture.balances, locked: { btc: '', stx: 'invalid' } },
      }}
      rewardCycleLength={900}
      prepareCycleLength={100}
      currentBurnHeight={9508}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  expect(screen.getAllByText('N/A')).toHaveLength(3);
  expect(screen.getByText('Bond balance unavailable')).toBeInTheDocument();
  expect(screen.getByText(/Paired balance unavailable/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '#19800' })).toHaveAttribute(
    'href',
    expect.stringContaining('/btcblock/19800?')
  );
});

test('an invalid enrollment prevents a misleading partial total', () => {
  renderWithChakraProviders(
    <CurrentBond
      featuredBond={bondFixture}
      enrollments={[{ btc: '100000000' }, { btc: 'invalid' }]}
      burnBlockTimes={{}}
      rewardCycleLength={900}
      prepareCycleLength={100}
      currentBurnHeight={9508}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText(/Enrollment data could not be loaded/)).toBeInTheDocument();
  expect(screen.queryByText('1 BTC')).not.toBeInTheDocument();
});

test('a finished bond shows its final day and identifies progress as a bond term', () => {
  renderWithChakraProviders(
    <CurrentBond
      featuredBond={bondFixture}
      burnBlockTimes={{}}
      rewardCycleLength={900}
      prepareCycleLength={100}
      currentBurnHeight={bondFixture.schedule.unlock.bitcoin_height + 144}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  expect(screen.getByText('Day 75 of 75')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Bond term progress' })).toHaveAttribute(
    'aria-valuenow',
    '100'
  );
});

test('unknown progress shows an unavailable label and an indeterminate progress bar', () => {
  renderWithChakraProviders(
    <CurrentBond
      featuredBond={bondFixture}
      burnBlockTimes={{}}
      rewardCycleLength={900}
      prepareCycleLength={100}
      currentBurnHeight={NaN}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  expect(screen.getByText('Progress unavailable')).toBeInTheDocument();
  expect(screen.getByText('Day unavailable')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Bond term progress' })).not.toHaveAttribute(
    'aria-valuenow'
  );
  expect(screen.queryByText(/NaN% elapsed/)).not.toBeInTheDocument();
});

test('a bond without verified setup metadata renders its schedule estimate', () => {
  renderWithChakraProviders(
    <CurrentBond
      featuredBond={bondFixture}
      burnBlockTimes={{}}
      rewardCycleLength={900}
      prepareCycleLength={100}
      currentBurnHeight={9508}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  expect(screen.getByText('Earliest setup window')).toBeInTheDocument();
  expect(screen.getByText('#7,200')).toBeInTheDocument();
  expect(screen.queryByText('Enrollment opened')).not.toBeInTheDocument();
});
