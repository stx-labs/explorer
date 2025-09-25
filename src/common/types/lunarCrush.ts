export interface LunarCrushCoin {
  config?: { coin: string; generated: number };
  data?: {
    id: number;
    name: string;
    symbol: string;
    price: number | null;
    price_btc: number | null;
    market_cap: number | null;
    percent_change_24h: number | null;
    percent_change_7d: number | null;
    volume_24h: number | null;
    max_supply: number | null;
    circulating_supply: number | null;
    close: number | null;
    galaxy_score: number | null;
    alt_rank: number | null;
    volatility: number | null;
    market_cap_rank: number | null;
  };
  error?: string;
}

export interface LunarCrushCoinRedesign {
  config?: { coin: string; generated: number };
  data?: {
    id: number;
    name: string;
    symbol: string;
    price?: number;
    price_btc?: number;
    market_cap?: number;
    percent_change_24h?: number;
    percent_change_7d?: number;
    volume_24h?: number;
    max_supply?: number;
    circulating_supply?: number;
    close?: number;
    galaxy_score?: number;
    alt_rank?: number;
    volatility?: number;
    market_cap_rank?: number;
  };
  error?: string;
}
