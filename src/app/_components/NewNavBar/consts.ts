import {
  SBTC_TOKEN_CONTRACT_ID_MAINNET,
  SBTC_TOKEN_CONTRACT_ID_TESTNET,
} from '@/app/token/[tokenId]/consts';

export type PrimaryPage = {
  id: PrimaryPageId;
  label: PrimaryPageLabel;
  href: string;
  shortcut?: string;
};

export type PrimaryPageLabel =
  | 'Home'
  | 'Blocks'
  | 'Transactions'
  | 'Mempool'
  | 'sBTC'
  | 'Stacking'
  | 'Signers'
  | 'Tokens'
  | 'NFTs'
  | 'Analytics'
  | 'Menu';

export type PrimaryPageId =
  | 'home'
  | 'blocks'
  | 'transactions'
  | 'mempool'
  | 'sbtc'
  | 'stacking'
  | 'signers'
  | 'tokens'
  | 'nfts'
  | 'analytics';

export const homePage: PrimaryPage = {
  id: 'home',
  label: 'Home',
  href: '/',
};

export const blocksPage: PrimaryPage = {
  id: 'blocks',
  label: 'Blocks',
  href: '/blocks',
};

export const transactionsPage: PrimaryPage = {
  id: 'transactions',
  label: 'Transactions',
  href: '/transactions',
};

export const mempoolPage: PrimaryPage = {
  id: 'mempool',
  label: 'Mempool',
  href: '/mempool',
};

export const sbtcMainnetPage: PrimaryPage = {
  id: 'sbtc',
  label: 'sBTC',
  href: `/token/${SBTC_TOKEN_CONTRACT_ID_MAINNET}`,
};

export const sbtcTestnetPage: PrimaryPage = {
  id: 'sbtc',
  label: 'sBTC',
  href: `/token/${SBTC_TOKEN_CONTRACT_ID_TESTNET}`,
};

export const stackingPage: PrimaryPage = {
  id: 'stacking',
  label: 'Stacking',
  href: '/stacking',
};

export const signersPage: PrimaryPage = {
  id: 'signers',
  label: 'Signers',
  href: '/signers',
};

export const tokensPage: PrimaryPage = {
  id: 'tokens',
  label: 'Tokens',
  href: '/tokens',
};

export const nftsPage: PrimaryPage = {
  id: 'nfts',
  label: 'NFTs',
  href: '/nfts',
};

export const analyticsPage: PrimaryPage = {
  id: 'analytics',
  label: 'Analytics',
  href: '/analytics',
};

export type SecondaryPageLabel = 'Sandbox' | 'Status Center' | 'Support';
export type SecondaryPageId = 'sandbox' | 'status-center' | 'support';

export type SecondaryPage = {
  id: SecondaryPageId;
  label: SecondaryPageLabel;
  href: string;
  shortcut?: string;
};

export const secondaryPages: SecondaryPage[] = [
  {
    id: 'sandbox',
    label: 'Sandbox',
    href: '/sandbox/deploy',
  },
  // {
  //   id: 'status-center',
  //   label: 'Status Center',
  //   href: '/status-center',
  // },
  {
    id: 'support',
    label: 'Support',
    href: '/support',
  },
];
