import { BONDS_PAGE_SIZE } from '../consts';
import { fetchBondsPage } from '../data';
import { clampBondPage } from './pagination';

export async function fetchBondPageAtIndex(requestedIndex: number, chain: string, api?: string) {
  let page = await fetchBondsPage(chain, api, BONDS_PAGE_SIZE);
  const pageIndex = clampBondPage(requestedIndex, page.total);
  const seen = new Set<string>();
  for (let index = 0; index < pageIndex; index++) {
    const cursor = page.nextCursor;
    if (cursor === null || seen.has(cursor)) throw new Error('Bond pagination did not advance');
    seen.add(cursor);
    page = await fetchBondsPage(chain, api, BONDS_PAGE_SIZE, cursor);
  }
  return { ...page, pageIndex };
}
