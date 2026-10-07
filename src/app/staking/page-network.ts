import { getAllowedStakingApiUrl } from '@/api/server-api-origin';
import { NetworkModes } from '@/common/types/network';
import { redirect } from 'next/navigation';

export function getStakingPageApiUrl(
  pathname: string,
  searchParams: { chain?: string; api?: string } & Record<string, string | string[] | undefined>
): string | undefined {
  const api = getAllowedStakingApiUrl(searchParams.chain ?? NetworkModes.Mainnet, searchParams.api);
  if (api && searchParams.api !== undefined && searchParams.api !== api) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach(item => params.append(key, item));
      else if (value !== undefined) params.set(key, value);
    }
    params.set('api', api);
    redirect(`${pathname}?${params}`);
  }
  return api;
}
