import { getSbtcContractId } from '@/app/token/[tokenId]/consts';
import { NetworkModes } from '@/common/types/network';

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
  | 'STX'
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
  | 'stx'
  | 'stacking'
  | 'signers'
  | 'tokens'
  | 'nfts'
  | 'analytics';

export const getPrimaryPages = (networkMode: NetworkModes): PrimaryPage[] => [
  {
    id: 'home',
    label: 'Home',
    href: '/',
  },
  {
    id: 'blocks',
    label: 'Blocks',
    href: '/blocks',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
  },
  {
    id: 'mempool',
    label: 'Mempool',
    href: '/mempool',
  },
  {
    id: 'sbtc',
    label: 'sBTC',
    href: `/token/${getSbtcContractId(networkMode)}`,
  },
  {
    id: 'stx',
    label: 'STX',
    href: '/stx',
  },
  // {
  //   id: 'stacking',
  //   label: 'Stacking',
  //   href: '/stacking',
  // },
  {
    id: 'signers',
    label: 'Signers',
    href: '/signers',
  },
  {
    id: 'tokens',
    label: 'Tokens',
    href: '/tokens',
  },
  // {
  //   id: 'nfts',
  //   label: 'NFTs',
  //   href: '/nfts',
  // },
  // {
  //   id: 'analytics',
  //   label: 'Analytics',
  //   href: '/analytics',
  // },
];

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
    shortcut: 'S',
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
