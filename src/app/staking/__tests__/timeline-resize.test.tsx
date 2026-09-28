import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';

import { PeriodsOverview } from '../PeriodsOverview';
import { TimelinePlot } from '../TimelinePlot';
import { getBondSchedule } from '../projections';
import bondFixture from './fixtures/bond.json';

const originalResizeObserver = globalThis.ResizeObserver;
const resizeCallbacks = new Map<Element, () => void>();

const keyboardProps: ComponentProps<typeof TimelinePlot> = {
  rows: [2, 3].map(index => ({
    index,
    label: `Bond ${index}`,
    state: 'upcoming',
    elapsedDistributions: 0,
    leftPercent: 20,
    widthPercent: 50,
    tooltip: {
      label: `Bond ${index}`,
      state: 'scheduled',
      schedule: getBondSchedule(12000, 22800, 900, 100),
    },
  })),
  cells: [],
  bounds: { startMs: Date.UTC(2026, 7, 1), endMs: Date.UTC(2026, 11, 1) },
  todayPercent: 30,
  currentBurnHeight: 9508,
  nowMs: Date.UTC(2026, 7, 25),
  rewardCycleLength: 900,
  firstBurnchainBlockHeight: 0,
};

beforeEach(() => {
  jest.useFakeTimers();
  globalThis.ResizeObserver = jest.fn().mockImplementation((callback: ResizeObserverCallback) => ({
    observe: (element: Element) =>
      resizeCallbacks.set(element, () => callback([], {} as ResizeObserver)),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 100,
    left: 100,
    top: 100,
    right: 900,
    bottom: 300,
    width: 800,
    height: 200,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
  resizeCallbacks.clear();
  globalThis.ResizeObserver = originalResizeObserver;
});

test('Tab can leave each hovercard, reach the next bond, and exit the plot', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  renderWithChakraProviders(
    <>
      <TimelinePlot {...keyboardProps} />
      <button>After plot</button>
    </>
  );
  const bars = screen.getAllByRole('img');
  act(() => bars[0].focus());
  for (const bar of bars) {
    expect(bar).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Estimate your yield' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Register interest' })).toHaveFocus();
    await user.tab();
    expect(bar).toHaveFocus();
    expect(screen.queryByRole('link', { name: 'Register interest' })).not.toBeInTheDocument();
    await user.tab();
  }
  expect(screen.getByRole('button', { name: 'After plot' })).toHaveFocus();
});

test('maturity has a consistent state and a keyboard-accessible Bitcoin block badge', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  renderWithChakraProviders(
    <PeriodsOverview
      bonds={[bondFixture]}
      featuredIndex={3}
      burnBlockTimes={{}}
      rewardCycleLength={900}
      prepareCycleLength={100}
      firstBurnchainBlockHeight={0}
      currentBurnHeight={19700}
      nowMs={Date.UTC(2026, 7, 25)}
    />
  );
  const bar = screen.getByRole('img', { name: /Bond 3, maturity/ });
  act(() => bar.focus());
  expect(screen.getByText('maturity')).toBeInTheDocument();
  const block = screen.getByRole('link', { name: '#19350' });
  expect(block).toHaveAttribute('href', expect.stringContaining('/btcblock/19350?'));
  await user.tab();
  expect(block).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(bar).toHaveFocus();
  expect(screen.queryByRole('link', { name: '#19350' })).not.toBeInTheDocument();
});

test.each([NaN, Infinity])(
  'a pointer with invalid first burn height %s never displays a NaN cycle',
  firstBurnchainBlockHeight => {
    const { container } = renderWithChakraProviders(
      <TimelinePlot {...keyboardProps} firstBurnchainBlockHeight={firstBurnchainBlockHeight} />
    );
    fireEvent.mouseMove(container.querySelector('[data-timeline-plot]')!, {
      clientX: 300,
      clientY: 150,
    });
    act(() => jest.advanceTimersByTime(20));
    expect(document.body).not.toHaveTextContent(/NaN|Infinity/);
    expect(document.body).toHaveTextContent(/#\d+/);
  }
);

test.each(['window', 'plot'])(
  '%s resize dismisses stale bond details and queued mouse work',
  source => {
    const { container } = renderWithChakraProviders(
      <TimelinePlot
        rows={[
          {
            index: 2,
            label: 'Bond 2',
            state: 'upcoming',
            elapsedDistributions: 0,
            leftPercent: 20,
            widthPercent: 50,
            tooltip: {
              label: 'Bond 2',
              state: 'scheduled',
              schedule: getBondSchedule(12000, 22800, 900, 100),
            },
          },
        ]}
        cells={[]}
        bounds={{ startMs: Date.UTC(2026, 7, 1), endMs: Date.UTC(2026, 11, 1) }}
        todayPercent={30}
        currentBurnHeight={9508}
        nowMs={Date.UTC(2026, 7, 25)}
        rewardCycleLength={900}
        firstBurnchainBlockHeight={0}
      />
    );
    const bar = screen.getByRole('img', { name: /Bond 2, scheduled/ });
    fireEvent.mouseMove(bar, { clientX: 300, clientY: 150 });
    act(() => jest.advanceTimersByTime(250));
    expect(screen.getByRole('link', { name: 'Estimate your yield' })).toBeInTheDocument();

    // Queue another animation frame immediately before resizing.
    fireEvent.mouseMove(bar, { clientX: 320, clientY: 150 });
    if (source === 'window') {
      fireEvent(window, new Event('resize'));
    } else {
      const plot = container.querySelector('[data-timeline-plot]')!;
      act(() => resizeCallbacks.get(plot)!());
    }
    expect(screen.queryByRole('link', { name: 'Estimate your yield' })).not.toBeInTheDocument();
    expect(screen.getByText('today · Aug 25')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.queryByRole('link', { name: 'Estimate your yield' })).not.toBeInTheDocument();

    // A fresh interaction still opens details using the new layout.
    fireEvent.focus(bar);
    expect(screen.getByRole('link', { name: 'Estimate your yield' })).toBeInTheDocument();
  }
);
