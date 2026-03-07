import { useCallback, useEffect, useRef } from 'react';

import { Block, NakamotoBlock, StacksApiWebSocketClient } from '@stacks/blockchain-api-client';

import { useGlobalContext } from '../../../../common/context/useGlobalContext';

interface Subscription {
  unsubscribe(): Promise<void>;
}

export function useSubscribeBlocks(
  liveUpdates: boolean,
  handleBlock: (block: NakamotoBlock | Block) => void,
  handleError?: (error: Error) => void
) {
  const subscription = useRef<Subscription | undefined>(undefined);
  const { stacksApiSocketClientInfo } = useGlobalContext();
  const { connect, disconnect } = stacksApiSocketClientInfo || {};

  const handleDisconnect = useCallback(() => {
    if (subscription.current) {
      subscription.current.unsubscribe();
      subscription.current = undefined;
    }
    disconnect?.();
  }, [disconnect]);

  useEffect(() => {
    const subscribe = async (client: StacksApiWebSocketClient) => {
      subscription.current = await client.subscribeBlocks(block => {
        handleBlock({
          ...(block as Block),
          parent_index_block_hash: '',
          tx_count: 0,
        });
      });
    };

    if (liveUpdates) {
      connect?.(client => subscribe(client), handleError);
    }
    if (!liveUpdates) {
      handleDisconnect();
    }
    return handleDisconnect;
  }, [handleBlock, connect, liveUpdates, handleDisconnect, handleError]);

  return subscription;
}
