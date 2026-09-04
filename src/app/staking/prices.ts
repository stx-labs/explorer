import { LUNAR_CRUSH_API_KEY } from '@/common/constants/env';

export interface DailyPrices {
  btc: Map<string, number>;
  stx: Map<string, number>;
}

export interface CyclePrices {
  btcPriceUsd?: number;
  stxPriceUsd?: number;
}

const REVALIDATE_SECONDS = 60 * 60;

function priceDayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

async function fetchDailySeries(
  coin: string,
  startSeconds: number,
  endSeconds: number
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (!LUNAR_CRUSH_API_KEY) return prices;
  const url =
    `https://lunarcrush.com/api4/public/coins/${coin}/time-series/v2` +
    `?bucket=day&interval=1d&start=${startSeconds}&end=${endSeconds}`;
  const response = await fetch(url, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-prices-${coin}`] },
    headers: { Authorization: `Bearer ${LUNAR_CRUSH_API_KEY}` },
  });
  if (!response.ok) return prices;
  const data: { data?: { time?: number; open?: number; close?: number }[] } = await response.json();
  for (const point of data?.data ?? []) {
    if (typeof point?.time !== 'number') continue;
    const price = point.close ?? point.open;
    if (typeof price !== 'number' || price <= 0) continue;
    prices.set(priceDayKey(point.time * 1000), price);
  }
  return prices;
}

export async function fetchDailyPrices(startMs: number, endMs: number): Promise<DailyPrices> {
  const day = 24 * 60 * 60;
  const start = Math.floor(startMs / 1000) - day;
  const end = Math.floor(endMs / 1000) + day;
  try {
    const [btc, stx] = await Promise.all([
      fetchDailySeries('btc', start, end),
      fetchDailySeries('stx', start, end),
    ]);
    return { btc, stx };
  } catch {
    return { btc: new Map(), stx: new Map() };
  }
}

function priceOn(prices: Map<string, number>, timestampMs: number): number | undefined {
  const MAX_LOOKBACK_DAYS = 4;
  for (let back = 0; back <= MAX_LOOKBACK_DAYS; back++) {
    const price = prices.get(priceDayKey(timestampMs - back * 24 * 60 * 60 * 1000));
    if (price !== undefined) return price;
  }
  return undefined;
}

export function getCyclePrices(prices: DailyPrices, endedMs: number): CyclePrices {
  return {
    btcPriceUsd: priceOn(prices.btc, endedMs),
    stxPriceUsd: priceOn(prices.stx, endedMs),
  };
}
