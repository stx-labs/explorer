import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';

import { TimelinePlot } from '../TimelinePlot';
import { getBondSchedule } from '../projections';

const originalResizeObserver = globalThis.ResizeObserver;
const resizeCallbacks = new Map<Element, () => void>();

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
    const bar = screen.getByRole('img', { name: /Bond 2, upcoming/ });
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
