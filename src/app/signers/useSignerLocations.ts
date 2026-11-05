import { useSuspenseQuery } from '@tanstack/react-query';

import { useGlobalContext } from '../../common/context/useGlobalContext';
import { TEN_MINUTES } from '../../common/queries/query-stale-time';

const SIGNER_LOCATION_QUERY_KEY = 'signer-addresses';

export interface SignerLocation {
  ip: string;
  country: string | null;
  ll: [number, number] | null;
  public: boolean;
}

export function useSignersLocation() {
  const { activeNetwork } = useGlobalContext();
  return useSuspenseQuery<SignerLocation[]>({
    queryKey: [SIGNER_LOCATION_QUERY_KEY],
    queryFn: () =>
      fetch(`https://assets.hiro.so/stacks/${activeNetwork.mode}/crawler/signer-nodes.json`)
        .then(res => res.json())
        .catch(err => {
          throw new Error('No signer location data available.');
        }),
    staleTime: TEN_MINUTES,
  });
}
