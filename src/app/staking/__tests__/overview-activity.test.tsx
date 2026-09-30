import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverviewActivity } from '../OverviewActivity';
import type { StakingActivityResult } from '../data';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => {
    const { useSyncExternalStore } = jest.requireActual('react');
    const search = useSyncExternalStore(
      (notify: () => void) => {
        window.addEventListener('popstate', notify);
        return () => window.removeEventListener('popstate', notify);
      },
      () => window.location.search
    );
    return new URLSearchParams(search);
  },
}));

const originalFetch = global.fetch;
const originalResizeObserver = global.ResizeObserver;
const nativeReplace = window.history.replaceState.bind(window.history);
const mockFetch = jest.fn();
const empty = { events: [], incomplete: false };
const respond = (data: StakingActivityResult) => ({ ok: true, json: async () => data });
const initialProps = () => ({
  chain: 'testnet',
  api: 'https://custom.test',
  initialData: empty,
  initialDataUpdatedAt: Date.now(),
});

beforeEach(() => {
  mockReplace.mockReset();
  mockFetch.mockReset();
  global.fetch = mockFetch;
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  nativeReplace(null, '', '/staking?chain=testnet&api=https%3A%2F%2Fcustom.test#activity');
  // Next patches native history to notify useSearchParams subscribers without navigation.
  jest.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    nativeReplace(...args);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  global.ResizeObserver = originalResizeObserver;
});

test('uses SSR data, then shallowly updates only the activity query with stable loading feedback', async () => {
  const user = userEvent.setup();
  let finish!: (value: ReturnType<typeof respond>) => void;
  mockFetch.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  renderWithProviders(<OverviewActivity {...initialProps()} />);
  expect(mockFetch).not.toHaveBeenCalled();
  const status = screen.getByRole('status');
  await user.click(screen.getByRole('tab', { name: 'Distributions' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  expect(mockFetch.mock.calls[0][0]).toBe(
    '/api/staking/activity?chain=testnet&api=https%3A%2F%2Fcustom.test&activity=distributions'
  );
  expect(mockReplace).not.toHaveBeenCalled();
  expect(window.location.search).toContain('activity=distributions');
  expect(window.location.hash).toBe('#activity');
  expect(screen.getByRole('tab', { name: 'Distributions' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(status).toHaveTextContent('Loading activity');
  await act(async () => {
    finish(respond(empty));
  });
  await waitFor(() => expect(status).toBeEmptyDOMElement());
  expect(screen.getByRole('status')).toBe(status);
  // Restoring a history entry updates the filter from the URL and reuses its initial data.
  act(() => {
    nativeReplace(null, '', '/staking?chain=testnet&api=https%3A%2F%2Fcustom.test');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByRole('tab', { name: /^All$/ })).toHaveAttribute('aria-selected', 'true');
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test('rapid selection cancels obsolete requests and ignores a late response from the old filter', async () => {
  const user = userEvent.setup();
  let finishOld!: (value: ReturnType<typeof respond>) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishOld = resolve;
      })
  );
  mockFetch.mockResolvedValueOnce(respond(empty));
  renderWithProviders(<OverviewActivity {...initialProps()} />);
  await user.click(screen.getByRole('tab', { name: 'Distributions' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  const oldSignal = mockFetch.mock.calls[0][1].signal as AbortSignal;
  await user.click(screen.getByRole('tab', { name: 'Enrollments' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    finishOld(respond({ events: [], incomplete: true }));
  });
  await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
  expect(screen.getByRole('tab', { name: 'Enrollments' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByText(/Some activity could not be loaded/)).not.toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('failed activity requests show unavailable feedback without navigating the overview', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 503 });
  const user = userEvent.setup();
  renderWithProviders(<OverviewActivity {...initialProps()} />);
  await user.click(screen.getByRole('tab', { name: /^Bonds$/ }));
  expect(await screen.findByText('Activity unavailable')).toBeInTheDocument();
  expect(screen.getByText(/Some activity could not be loaded/)).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('query cache is isolated by chain and custom API', async () => {
  mockFetch.mockResolvedValue(respond(empty));
  const user = userEvent.setup();
  const props = initialProps();
  const { rerender } = renderWithProviders(<OverviewActivity {...props} />);
  await user.click(screen.getByRole('tab', { name: 'Distributions' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  rerender(<OverviewActivity {...props} chain="mainnet" api="https://another.test" />);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  expect(mockFetch.mock.calls[1][0]).toBe(
    '/api/staking/activity?chain=mainnet&api=https%3A%2F%2Fanother.test&activity=distributions'
  );
});
