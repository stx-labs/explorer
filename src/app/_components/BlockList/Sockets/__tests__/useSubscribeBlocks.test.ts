import { renderHook } from '@testing-library/react';

import { useSubscribeBlocks } from '../useSubscribeBlocks';

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
          subscribeBlocks: jest.fn().mockResolvedValue(mockSubscription),
        };
        handleConnect(mockClient);
      }),
      disconnect: mockDisconnect,
    },
  })),
}));

describe('useSubscribeBlocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls unsubscribe and clears subscription on cleanup', async () => {
    const handleBlock = jest.fn();

    const { unmount } = renderHook(() => useSubscribeBlocks(true, handleBlock));

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

  it('does not create subscription when liveUpdates is false', () => {
    const handleBlock = jest.fn();

    renderHook(() => useSubscribeBlocks(false, handleBlock));

    expect(mockConnect).not.toHaveBeenCalled();
  });
});
