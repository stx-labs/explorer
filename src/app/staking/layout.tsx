import { meta } from '@/common/constants/meta';
import { Metadata } from 'next';
import { ReactNode } from 'react';

import { StakingStyleRegistry } from './StakingStyleRegistry';

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Bitcoin Staking';
  const description = 'Explore Bitcoin staking bonds, rewards, activity, and STX staking cycles.';
  return { ...meta, title, description, openGraph: { ...meta.openGraph, title, description } };
}

export default function Layout({ children }: { children: ReactNode }) {
  return <StakingStyleRegistry>{children}</StakingStyleRegistry>;
}
