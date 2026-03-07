import { useCallback, useRef } from 'react';

import { StacksApiWebSocketClient } from '@stacks/blockchain-api-client';

export interface StacksApiSocketClientInfo {
  client: StacksApiWebSocketClient | null;
  connect: (
    handleOnConnect?: (client: StacksApiWebSocketClient) => void,
    handleError?: (error: Error) => void
  ) => void;
  disconnect: () => void;
}

export function useStacksApiSocketClient(apiUrl: string): StacksApiSocketClientInfo {
  const clientRef = useRef<StacksApiWebSocketClient | null>(null);
  const isConnecting = useRef(false);
  const connectId = useRef(0);

  const disconnect = useCallback(() => {
    connectId.current++;
    if (clientRef.current) {
      clientRef.current.webSocket.close();
      clientRef.current = null;
    }
    isConnecting.current = false;
  }, []);

  const connect = useCallback(
    async (
      handleOnConnect?: (client: StacksApiWebSocketClient) => void,
      handleError?: (error: Error) => void
    ) => {
      if (!apiUrl) return;
      if (clientRef.current || isConnecting.current) {
        return;
      }
      const currentConnectId = ++connectId.current;
      try {
        isConnecting.current = true;
        const client = await StacksApiWebSocketClient.connect(apiUrl);
        if (currentConnectId !== connectId.current) {
          client.webSocket.close();
          return;
        }
        clientRef.current = client;
        isConnecting.current = false;
        handleOnConnect?.(client);
      } catch (error) {
        if (currentConnectId !== connectId.current) return;
        isConnecting.current = false;
        clientRef.current = null;
        handleError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [apiUrl, disconnect]
  );

  return {
    client: clientRef.current,
    connect,
    disconnect,
  };
}
