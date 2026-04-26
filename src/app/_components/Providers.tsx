'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { CookiesProvider } from 'react-cookie';
import { Provider as ReduxProvider } from 'react-redux';

import { GlobalContextProvider } from '../../common/context/GlobalContextProvider';
import { store } from '../../common/state/store';
import { WatchlistPersistence } from '../../features/watchlist/WatchlistPersistence';
import { TokenPrice } from '../../common/types/tokenPrice';
import { ColorModeProvider } from '../../components/ui/color-mode';
import { system } from '../../ui/theme/theme';

const queryClient = new QueryClient({
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
              <WatchlistPersistence />
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </ReduxProvider>
          </ColorModeProvider>
        </GlobalContextProvider>
      </CookiesProvider>
    </ChakraProvider>
  );
};
