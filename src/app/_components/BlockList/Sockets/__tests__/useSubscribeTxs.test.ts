import { renderHook } from '@testing-library/react';

import { useSubscribeTxs } from '../useSubscribeTxs';

const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn();
const mockConnect = jest.fn();

// Mock the global context to return our test client
const mockSubscription = {
  unsubscribe: mockUnsubscribe,
};

jest.mock('../../../../../common/context/useGlobalContext', () => ({
  useGlobalContext: jest.fn(() => ({
    stacksApiSocketClientInfo: {
      connect: mockConnect.mockImplementation(handleConnect => {
        const mockClient = {
          subscribeMempool: jest.fn().mockResolvedValue(mockSubscription),
        };
        handleConnect(mockClient);
      }),
      disconnect: mockDisconnect,
    },
  })),
}));

describe('useSubscribeTxs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls unsubscribe and clears subscription on cleanup', async () => {
    const handleTransaction = jest.fn();

    const { unmount } = renderHook(() => useSubscribeTxs(true, handleTransaction));

    // Verify subscription was created only once
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Wait for async subscription to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    // Unmount the hook
    unmount();

    // Verify cleanup was called
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not create subscription when isSubscriptionActive is false', () => {
    const handleTransaction = jest.fn();

    renderHook(() => useSubscribeTxs(false, handleTransaction));

    expect(mockConnect).not.toHaveBeenCalled();
  });
});
