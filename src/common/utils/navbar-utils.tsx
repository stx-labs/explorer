import {
  PrimaryPage,
  blocksPage,
  homePage,
  mempoolPage,
  sbtcMainnetPage,
  sbtcTestnetPage,
  signersPage,
  tokensPage,
  transactionsPage,
} from '@/app/_components/NewNavBar/consts';

import { useGlobalContext } from '../context/useGlobalContext';

export function usePrimaryPages(): PrimaryPage[] {
  const network = useGlobalContext().activeNetwork;
  const sbtcPage = network.mode === 'mainnet' ? sbtcMainnetPage : sbtcTestnetPage;
  return [homePage, blocksPage, transactionsPage, mempoolPage, sbtcPage, signersPage, tokensPage];
}
