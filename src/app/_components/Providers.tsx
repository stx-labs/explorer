'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { CookiesProvider } from 'react-cookie';
import { Provider as ReduxProvider } from 'react-redux';

import { ApiError, getApiErrorFingerprint, getApiErrorSeverity } from '../../api/ApiError';
import { GlobalContextProvider } from '../../common/context/GlobalContextProvider';
import { store } from '../../common/state/store';
import { TokenPrice } from '../../common/types/tokenPrice';
import { logError } from '../../common/utils/error-utils';
import { ColorModeProvider } from '../../components/ui/color-mode';
import { system } from '../../ui/theme/theme';

// Mutations resolve their rejection into `mutation.error`, so nothing reaches Sentry on its own.
// Without this a broken faucet or sandbox broadcast fails silently for every user.
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    const apiError = error instanceof ApiError ? error : undefined;
    const status = apiError?.status;
    const endpoint = apiError?.endpoint ?? 'unknown';
    logError(
      error instanceof Error ? error : new Error(String(error)),
      `mutation ${mutation.options.mutationKey?.join('.') ?? 'unknown'}`,
      { endpoint },
      getApiErrorSeverity(status),
      { fingerprint: getApiErrorFingerprint(endpoint, 'POST', status) },
      {
        'api.method': 'POST',
        'api.status': status === undefined ? 'no-status' : String(status),
      }
    );
  },
});

const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false,
      staleTime: 5000,
    },
  },
});

export const Providers = ({
  children,
  addedCustomNetworksCookie,
  removedCustomNetworksCookie,
  tokenPrice,
  serverTheme,
}: {
  children: ReactNode;
  addedCustomNetworksCookie: string | undefined;
  removedCustomNetworksCookie: string | undefined;
  tokenPrice: TokenPrice;
  serverTheme: string | undefined;
}) => {
  return (
    <ChakraProvider value={system}>
      <CookiesProvider>
        <GlobalContextProvider
          addedCustomNetworksCookie={addedCustomNetworksCookie}
          removedCustomNetworksCookie={removedCustomNetworksCookie}
          tokenPrice={tokenPrice}
        >
          <ColorModeProvider serverTheme={serverTheme}>
            <ReduxProvider store={store}>
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </ReduxProvider>
          </ColorModeProvider>
        </GlobalContextProvider>
      </CookiesProvider>
    </ChakraProvider>
  );
};
