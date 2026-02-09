import packageJson from '../../../package.json';

export const CONNECT_AUTH_ORIGIN =
  process.env.NEXT_PUBLIC_CONNECT_AUTH_ORIGIN || 'https://pr-725.app.stacks.engineering';

export const DEFAULT_MAINNET_SERVER =
  process.env.NEXT_PUBLIC_MAINNET_API_SERVER || 'https://api.hiro.so';
export const MAINNET_BTC_BLOCK_BASE_URL =
  process.env.NEXT_PUBLIC_MAINNET_BTC_BLOCK_BASE_URL || 'https://mempool.space/block';
export const MAINNET_BTC_TX_BASE_URL =
  process.env.NEXT_PUBLIC_MAINNET_BTC_TX_BASE_URL || 'https://mempool.space/tx';
export const MAINNET_BTC_ADDRESS_BASE_URL =
  process.env.NEXT_PUBLIC_MAINNET_BTC_ADDRESS_BASE_URL || 'https://mempool.space/address';

export const DEFAULT_TESTNET_SERVER =
  process.env.NEXT_PUBLIC_TESTNET_API_SERVER || 'https://api.testnet.hiro.so';
export const TESTNET_BTC_BLOCK_BASE_URL =
  process.env.NEXT_PUBLIC_TESTNET_BTC_BLOCK_BASE_URL ||
  'https://mempool.bitcoin.regtest.hiro.so/block';
export const TESTNET_BTC_TX_BASE_URL =
  process.env.NEXT_PUBLIC_TESTNET_BTC_TX_BASE_URL || 'https://mempool.bitcoin.regtest.hiro.so/tx';
export const TESTNET_BTC_ADDRESS_BASE_URL =
  process.env.NEXT_PUBLIC_TESTNET_BTC_ADDRESS_BASE_URL ||
  'https://mempool.bitcoin.regtest.hiro.so/address';

export const DEVNET_PORT = process.env.NEXT_PUBLIC_EXPLORER_DEVNET_PORT || '8000';
export const DEVNET_SERVER =
  process.env.NEXT_PUBLIC_EXPLORER_DEVNET_SERVER || 'http://localhost:3999';

export const LUNAR_CRUSH_API_KEY = process.env.LUNAR_CRUSH_API_KEY || '';

export const CMS_URL = process.env.CMS_URL ?? '';

export const NODE_ENV = process.env.NODE_ENV || '';

export const RELEASE_TAG_NAME = process.env.NEXT_PUBLIC_RELEASE_TAG_NAME ?? '';
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

export const HIRO_HEADERS = {
  'x-hiro-product': 'explorer',
  'x-hiro-version': RELEASE_TAG_NAME || packageJson.version,
};
