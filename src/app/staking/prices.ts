import { LUNAR_CRUSH_API_KEY } from '@/common/constants/env';

/**
 * Daily BTC and STX prices, for pricing a cycle at the time it ended.
 *
 * A completed cycle's yield is a fact about the period it covers, so pricing it
 * at today's rates makes every historical figure move whenever the market does.
 * The market endpoint takes a range, so a whole page of cycles costs one
 * request per coin rather than one per cycle.
 */
export interface DailyPrices {
  btc: Map<string, number>;
  stx: Map<string, number>;
}

export interface CyclePrices {
  btcPriceUsd?: number;
  stxPriceUsd?: number;
}

const REVALIDATE_SECONDS = 60 * 60;

/** The bucket a timestamp belongs to, in UTC, matching the API's day buckets. */
export function priceDayKey(timestampMs: number): string {
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
    // A cycle ends within its day, so the day's close is the closest reading.
    const price = point.close ?? point.open;
    if (typeof price !== 'number' || price <= 0) continue;
    prices.set(priceDayKey(point.time * 1000), price);
  }
  return prices;
}

/**
 * Prices for every day in a range. Returns empty maps rather than throwing, so
 * a market outage costs the rate rather than the page.
 */
export async function fetchDailyPrices(startMs: number, endMs: number): Promise<DailyPrices> {
  // A day either side, so a cycle landing near a boundary still finds a bucket.
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

/**
 * The price on a given day, stepping back if that day has no bucket.
 *
 * Cycle end dates are projected from block heights, so a lookup can land a day
 * or two off a real bucket. Walking back a few days beats reporting nothing.
 */
export function priceOn(prices: Map<string, number>, timestampMs: number): number | undefined {
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
