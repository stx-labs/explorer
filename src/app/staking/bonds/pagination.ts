import { BONDS_PAGE_SIZE } from '../consts';

export function parseBondPage(value?: string): number {
  const page = Number(value ?? '1');
  return Number.isSafeInteger(page) && page > 0 ? page - 1 : 0;
}

export function clampBondPage(pageIndex: number, total: number): number {
  return Math.min(pageIndex, Math.max(Math.ceil(total / BONDS_PAGE_SIZE) - 1, 0));
}

export function bondPageHref(params: URLSearchParams, pageIndex: number): string {
  const next = new URLSearchParams(params);
  if (pageIndex > 0) next.set('page', String(pageIndex + 1));
  else next.delete('page');
  const query = next.toString();
  return `/staking/bonds${query ? `?${query}` : ''}`;
}
