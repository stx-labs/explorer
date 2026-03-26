import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';

import { meta } from '../common/constants/meta';
import {
  instrumentSans,
  inter,
  matterMonoRegular,
  matterRegular,
  openSauce,
} from '../common/fonts';
import { PageWrapper } from './_components/PageWrapper';
import { Providers } from './_components/Providers';
import { getStatusBarContent } from './getStatusBarContent';
import { getTokenPrice } from './getTokenPriceInfo';
import './global.css';

export async function generateMetadata(): Promise<Metadata> {
  return Promise.resolve(meta);
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const addedCustomNetworksCookie = cookieStore.get('addedCustomNetworks')?.value;
  const removedCustomNetworksCookie = cookieStore.get('removedCustomNetworks')?.value;

  const tokenPrice = await getTokenPrice();
  const statusBarContent = await getStatusBarContent();
  const serverTheme =
    cookieStore.get('stacks-explorer-color-mode')?.value ||
    cookieStore.get('stacks-explorer-theme')?.value;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSans.variable} ${openSauce.variable} ${matterRegular.variable} ${matterMonoRegular.variable}`}
    >
      <body>
        <Providers
          addedCustomNetworksCookie={addedCustomNetworksCookie}
          removedCustomNetworksCookie={removedCustomNetworksCookie}
          tokenPrice={tokenPrice}
          serverTheme={serverTheme}
        >
          <PageWrapper statusBarContent={statusBarContent}>{children}</PageWrapper>
        </Providers>
      </body>
      <GoogleAnalytics gaId="G-NB2VBT0KY2" />
      <GoogleTagManager gtmId="GTM-W534HQ4X" />
    </html>
  );
}
