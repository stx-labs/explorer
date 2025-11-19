import { useSearchQuery } from '../../../common/queries/useSearchQuery';
import { Network } from '../../../common/types/network';
import { SearchResultType } from '../../../common/types/search-results';
import { buildUrl } from '../../../common/utils/buildUrl';

// Convert a successful search result into a navigable, network-aware URL for the matching entity.
export function getSearchEntityUrl(
  activeNetwork: Network,
  result?: ReturnType<typeof useSearchQuery>['data']
) {
  if (!result || !result.found || result.result.entity_type === SearchResultType.TxList) {
    return;
  }

  switch (result.result.entity_type) {
    case SearchResultType.BlockHash:
      return buildUrl(`/block/${encodeURIComponent(result.result.entity_id)}`, activeNetwork);
    case SearchResultType.ContractAddress:
    case SearchResultType.MempoolTxId:
    case SearchResultType.TxId:
      return buildUrl(`/txid/${encodeURIComponent(result.result.entity_id)}`, activeNetwork);
    case SearchResultType.StandardAddress:
    case SearchResultType.BnsAddress:
      return buildUrl(`/address/${encodeURIComponent(result.result.entity_id)}`, activeNetwork);
  }
}
