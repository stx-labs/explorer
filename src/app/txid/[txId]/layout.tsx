import { fetchTx } from '@/api/data-fetchers';
import { diagnoseSync, isFailedContractCall } from '@/common/tx-diagnosis';
import { NetworkModes } from '@/common/types/network';
import { getApiUrl } from '@/common/utils/network-utils';
import { Metadata, ResolvingMetadata } from 'next';
import { ReactNode } from 'react';

import { meta } from '../../../common/constants/meta';
import { truncateMiddleDeprecated } from '../../../common/utils/utils';

/**
 * For failed contract calls the description carries the deterministic headline so link previews
 * say what went wrong. `fetchTx` is deduplicated with the page's own fetch within the request.
 */
async function failureDescription(
  txId: string,
  searchParams: Record<string, string | undefined>
): Promise<string | undefined> {
  if (searchParams.ssr === 'false') return undefined;
  try {
    const apiUrl = getApiUrl(searchParams.chain || NetworkModes.Mainnet, searchParams.api);
    const tx = await fetchTx(apiUrl, txId);
    if (!isFailedContractCall(tx)) return undefined;
    const d = diagnoseSync(tx, null);
    return `${d.headline} ${d.senderAction}`;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(props: any, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const title = `STX Transaction - ${truncateMiddleDeprecated(params?.txId)}`;
  const description = params?.txId
    ? await failureDescription(params.txId, searchParams)
    : undefined;
  return {
    ...meta,
    title,
    ...(description ? { description } : {}),
    openGraph: {
      ...meta.openGraph,
      title,
      ...(description ? { description } : {}),
    },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
