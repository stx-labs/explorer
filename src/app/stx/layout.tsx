import { meta } from '@/common/constants/meta';
import { Metadata, ResolvingMetadata } from 'next';
import { ReactNode } from 'react';

import { STX_NAME, STX_SYMBOL } from './consts';

export async function generateMetadata(props: any, parent: ResolvingMetadata): Promise<Metadata> {
  const title = `${STX_NAME} (${STX_SYMBOL})`;
  return Promise.resolve({
    ...meta,
    title,
    openGraph: {
      ...meta.openGraph,
      title,
    },
  });
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
