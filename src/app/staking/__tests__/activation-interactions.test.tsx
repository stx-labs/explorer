import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, use, useState } from 'react';

import { StakingActivity } from '../StakingActivity';
import { ActivityPageClient } from '../activity/PageClient';
import { BondsPageClient } from '../bonds/PageClient';
import type { ActivityGroup } from '../data';
import bond from './fixtures/bond.json';

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => new URLSearchParams('chain=testnet&bond=3'),
}));

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
beforeEach(() => {
  mockReplace.mockReset();
  mockPush.mockReset();
});

function WaitForRoute({ pending }: { pending?: Promise<void> }) {
  if (pending) use(pending);
  return null;
}

test.each([
  [false, false, 'No activity for Bond 3'],
  [false, true, 'No recent activity for Bond 3'],
  [true, false, 'Activity unavailable'],
  [true, true, 'Activity unavailable'],
])(
  'activity failure=%s and truncated=%s have independent notices',
  (incomplete, historyTruncated, emptyMessage) => {
    renderWithChakraProviders(
      <ActivityPageClient
        events={[]}
        bondIndex={3}
        incomplete={incomplete}
        historyTruncated={historyTruncated}
      />
    );
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
    expect(Boolean(screen.queryByText(/Some activity could not be loaded/))).toBe(incomplete);
    expect(Boolean(screen.queryByText(/This bond history may be incomplete/))).toBe(
      historyTruncated
    );
    expect(Boolean(screen.queryByText(/Only the newest 60 staking transactions/))).toBe(
      historyTruncated
    );
    if (incomplete) expect(screen.queryByText(/No (recent )?activity for/)).not.toBeInTheDocument();
    if (!historyTruncated)
      expect(screen.queryByText(/Older activity is not shown/)).not.toBeInTheDocument();
  }
);

test('arrow navigation waits for activation, selected filter updates immediately, and status stays mounted', async () => {
  const user = userEvent.setup();
  let finish!: () => void;
  function Harness() {
    const [route, setRoute] = useState<{ group?: ActivityGroup; pending?: Promise<void> }>({});
    mockReplace.mockImplementation((href: string) => {
      const group = new URLSearchParams(href.slice(1)).get('activity') as ActivityGroup;
      setRoute({
        group,
        pending: new Promise(resolve => {
          finish = resolve;
        }),
      });
    });
    return (
      <Suspense fallback={<span>Route fallback</span>}>
        <WaitForRoute pending={route.pending} />
        <StakingActivity events={[]} selectedGroup={route.group} />
      </Suspense>
    );
  }
  renderWithChakraProviders(<Harness />);
  const status = screen.getByRole('status');
  expect(status).toBeEmptyDOMElement();
  const all = screen.getByRole('tab', { name: /^All$/ });
  act(() => all.focus());
  await user.keyboard('{ArrowRight}');
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Distributions' })).toHaveFocus());
  expect(mockReplace).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('?chain=testnet&bond=3&activity=distributions', {
      scroll: false,
    })
  );
  expect(screen.getByRole('tab', { name: 'Distributions' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(status).toHaveTextContent('Loading activity');
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(status).toBeEmptyDOMElement());
  expect(screen.getByRole('status')).toBe(status);
});

test('bond page navigation preserves network settings and announces the pending server update', async () => {
  const user = userEvent.setup();
  let finish!: () => void;
  function Harness() {
    const [pending, setPending] = useState<Promise<void>>();
    mockPush.mockImplementation(() =>
      setPending(
        new Promise(resolve => {
          finish = resolve;
        })
      )
    );
    return (
      <Suspense fallback={<span>Route fallback</span>}>
        <WaitForRoute pending={pending} />
        <BondsPageClient
          bonds={[bond]}
          total={40}
          pageIndex={0}
          pageSize={20}
          burnBlockTimes={{}}
          currentBurnHeight={9508}
          nowMs={Date.UTC(2026, 8, 1)}
        />
      </Suspense>
    );
  }
  renderWithChakraProviders(<Harness />);
  const status = screen.getByRole('status');
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(mockPush).toHaveBeenCalledWith('/staking/bonds?chain=testnet&bond=3&page=2', {
    scroll: true,
  });
  expect(status).toHaveTextContent('Loading bonds');
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(status).toBeEmptyDOMElement());
});
