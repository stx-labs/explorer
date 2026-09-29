import type { Network } from '@/common/types/network';
import { buildUrl } from '@/common/utils/buildUrl';

export function bondActivityHref(index: number, network: Network): string {
  return buildUrl(`/staking/activity?bond=${encodeURIComponent(index)}`, network);
}
