import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AnnotatedValue } from '../AnnotatedValue';
import { BondsTable } from '../BondsTable';
import { CurrentBond } from '../CurrentBond';
import { StakingPageClient, StakingPageData } from '../PageClient';
import { StackingOverview } from '../StackingOverview';
import { StakingStats } from '../StakingStats';
import { BONDS_TABLE_LIMIT } from '../consts';
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

const overviewWithoutPox: StakingPageData = {
  bonds: [bondFixture],
  bondsUnavailable: false,
  cycles: [],
  cycleRewards: {},
  currentBurnHeight: 0,
  nowMs: Date.UTC(2026, 8, 1),
  rewardCycleLength: 0,
  prepareCycleLength: 0,
  firstBurnchainBlockHeight: 0,
  burnBlockTimes: {},
  rewarded: {
    byBondIndex: { [bondFixture.index]: BigInt(100000000) },
    settlementsByBond: {},
    lastCalculationHeightByCycle: {},
  },
};

test('overview preserves bonds and known rewards when PoX is missing without inventing dates or rates', () => {
  renderWithChakraProviders(<StakingPageClient {...overviewWithoutPox} section="bonds" />);
  expect(screen.getByText(/Some staking data could not be loaded/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Bonds' })).toBeInTheDocument();
  expect(screen.getByText('Bond 3')).toBeInTheDocument();
  expect(screen.getByText('1 sBTC')).toBeInTheDocument();
  expect(screen.getByText('Unavailable → Unavailable')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Current Bitcoin block height is unavailable.' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Current bond' })).not.toBeInTheDocument();
});

test('overview fallback retains table pagination for the loaded bonds', async () => {
  const user = userEvent.setup();
  const bonds = Array.from({ length: BONDS_TABLE_LIMIT + 1 }, (_, i) => ({
    ...bondFixture,
    index: i + 1,
  }));
  renderWithChakraProviders(
    <StakingPageClient {...overviewWithoutPox} bonds={bonds} section="bonds" />
  );
  expect(screen.queryByText('Genesis')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(await screen.findByText('Genesis')).toBeInTheDocument();
});

test('overview does not substitute a misleading empty table when both bonds and PoX fail', () => {
  renderWithChakraProviders(
    <StakingPageClient {...overviewWithoutPox} bonds={[]} bondsUnavailable section="bonds" />
  );
  expect(screen.getByText(/Some staking data could not be loaded/)).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText('No bonds yet')).not.toBeInTheDocument();
});

test('missing PoX does not duplicate the bond fallback in the stacking section', () => {
  renderWithChakraProviders(<StakingPageClient {...overviewWithoutPox} section="stacking" />);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
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

test.each([true, false])(
  'zero-stake APY uses a simple explanation with historical prices=%s',
  historical => {
    const endedMs = Date.UTC(2026, 8, 8);
    renderWithChakraProviders(
      <StackingOverview
        poxInfo={
          {
            current_cycle: { id: 144 },
            reward_cycle_length: 2100,
            next_reward_cycle_in: 2000,
          } as React.ComponentProps<typeof StackingOverview>['poxInfo']
        }
        cycles={[
          {
            cycle_number: 143,
            total_stacked_amount: '0',
            total_signers: 0,
            total_weight: 0,
            block_height: 0,
          },
        ]}
        cycleRewards={{
          143: { cycleNumber: 143, rewardsSats: BigInt(0), stakedMicroStx: BigInt(0) },
        }}
        pox5FirstCycleId={141}
        firstBurnchainBlockHeight={0}
        currentBurnHeight={302500}
        nowMs={endedMs + 86400000}
        burnBlockTimes={{ 302399: endedMs }}
        lastCalculationHeightByCycle={{ 143: 302399 }}
        prices={
          historical
            ? { btc: new Map([['2026-09-08', 100000]]), stx: new Map([['2026-09-08', 1]]) }
            : undefined
        }
      />
    );
    expect(screen.getByText('No STX was staked.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No STX was staked.' })).toBeInTheDocument();
    expect(
      screen.queryByText(/Gross APY at historical|Gross APY estimated at current/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Prices are unavailable/ })
    ).not.toBeInTheDocument();
  }
);
