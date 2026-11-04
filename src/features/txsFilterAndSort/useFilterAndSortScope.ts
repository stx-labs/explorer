import { usePathname } from 'next/navigation';

import { TxFilterAndSortTypes } from './txsFilterAndSortSlice';

/**
 * Maps URL pathname patterns to their corresponding transaction filter and sort scopes.
 * This mapping determines which filter/sort state should be used based on the current route.
 *
 * The keys are URL path prefixes, and the values are the corresponding filter types
 * that should be applied when the user is on that route.
 */
const pathnameFilterScopeMap: Record<string, TxFilterAndSortTypes> = {
  '/transactions': TxFilterAndSortTypes.TxsPageTxFilter, // Main transactions page
  '/mempool': TxFilterAndSortTypes.MempoolPageTxFilter, // Mempool page
  '/txid/': TxFilterAndSortTypes.TxPageTxFilter, // Individual transaction page
  '/address/': TxFilterAndSortTypes.AddressTxFilter, // Address details page
  '/block/': TxFilterAndSortTypes.BlocksPageTxFilter, // Block details page
  '/microblock/': TxFilterAndSortTypes.BlocksPageTxFilter, // Microblock details page
  '/sandbox/deploy': TxFilterAndSortTypes.SandboxTxFilter, // Sandbox deploy page
  '/sandbox/contract-call': TxFilterAndSortTypes.SandboxTxFilter, // Sandbox contract call page
  '/sandbox/faucet': TxFilterAndSortTypes.SandboxTxFilter, // Sandbox faucet page
  '/sandbox/transfer': TxFilterAndSortTypes.SandboxTxFilter, // Sandbox transfer page
  '/search': TxFilterAndSortTypes.SearchTxFilter, // Search results page
  '/': TxFilterAndSortTypes.HomepageTxFilter, // Homepage
};

/**
 * A hook that determines the appropriate transaction filter and sort scope
 * based on the current URL pathname.
 *
 * This hook is used to ensure that different pages in the application
 * maintain their own independent filter and sort states. For example,
 * the filters on the transactions page won't affect the filters on the
 * address page.
 *
 * @returns {TxFilterAndSortTypes} The filter and sort scope for the current route
 *
 * @example
 * // In a component:
 * const filterScope = useFilterAndSortScope();
 * // filterScope will be TxFilterAndSortTypes.TxsPageTxFilter when on /transactions
 * // filterScope will be TxFilterAndSortTypes.AddressTxFilter when on /address/...
 */
export const useFilterAndSortScope = (): TxFilterAndSortTypes => {
  // Get the current pathname from Next.js router
  // Default to '/' if pathname is undefined (shouldn't happen in practice)
  const path = usePathname() || '/';

  // Find the first matching path prefix in our mapping
  // This allows for nested routes to inherit their parent's filter scope
  const key = Object.keys(pathnameFilterScopeMap).find(key => path.startsWith(key));

  // If no matching path is found, default to the homepage filter scope
  if (!key) return TxFilterAndSortTypes.HomepageTxFilter;

  // Return the corresponding filter scope for the matched path
  return pathnameFilterScopeMap[key];
};
