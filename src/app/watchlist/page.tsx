import { Metadata } from 'next';

import { meta } from '@/common/constants/meta';

import WatchlistPageClient from './WatchlistPageClient';

export const metadata: Metadata = {
  title: 'Watchlist | Stacks Explorer',
  description: meta.description,
  openGraph: { ...meta.openGraph, title: 'Watchlist | Stacks Explorer' },
};

export default function WatchlistPage() {
  return <WatchlistPageClient />;
}
