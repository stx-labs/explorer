import {
  SBTC_TOKEN_CONTRACT_ID_MAINNET,
  SBTC_TOKEN_CONTRACT_ID_TESTNET,
} from '@/app/token/[tokenId]/consts';
import { usePrimaryPages } from '@/common/utils/navbar-utils';
import { Text } from '@/ui/Text';
import { Flex, Icon, Separator, Stack } from '@chakra-ui/react';
import { CaretUpDown, List } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SlidingMenu } from '../../../common/components/SlidingMenu';
import { PrimaryPageLink, SecondaryPageLink } from './PagesLinks';
import { PrimaryPageLabel, secondaryPages } from './consts';

const getPageLabelFromPath = (path: string): PrimaryPageLabel => {
  if (path === '/transactions') return 'Transactions';
  if (path === '/tokens') return 'Tokens';
  if (path === `/token/${SBTC_TOKEN_CONTRACT_ID_MAINNET}`) return 'sBTC';
  if (path === `/token/${SBTC_TOKEN_CONTRACT_ID_TESTNET}`) return 'sBTC';
  if (path === '/signers') return 'Signers';
  if (path === '/blocks') return 'Blocks';
  if (path === '/mempool') return 'Mempool';
  if (path === '/stacking') return 'Stacking';
  if (path === '/analytics') return 'Analytics';
  if (path === '/nfts') return 'NFTs';
  if (path === '/') return 'Home';
  return 'Menu';
};

const menuWidth = 50;
const triggerHeight = 10;

export const PagesSlidingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const path = usePathname();
  const pageLabel = getPageLabelFromPath(path);
  const primaryPages = usePrimaryPages();

  const menuContent = useMemo(() => {
    return (
      <Stack gap={2}>
        <Stack gap={0}>
          {primaryPages
            .filter(page => page.label !== pageLabel)
            .map(page => (
              <PrimaryPageLink page={page} key={page.id} onClick={() => setIsOpen(false)} />
            ))}
        </Stack>
        <Separator borderColor="redesignBorderSecondary" />
        <Stack gap={2} px={3} py={2}>
          {secondaryPages.map(page => (
            <SecondaryPageLink page={page} key={page.id} onClick={() => setIsOpen(false)} />
          ))}
        </Stack>
      </Stack>
    );
  }, [pageLabel, primaryPages]);

  return (
    <SlidingMenu
      triggerWidth={menuWidth}
      triggerHeight={triggerHeight}
      menuTrigger={
        <Flex gap={6} alignItems="center" justifyContent="space-between">
          <Flex gap={3} alignItems="center">
            <Flex
              h={6}
              w={8}
              alignItems="center"
              justifyContent="center"
              borderRadius="redesign.sm"
              bg={isOpen ? 'surfaceFifth' : 'transparent'}
            >
              <Icon h={4} w={4}>
                <List />
              </Icon>
            </Flex>
            <Text fontSize="sm">{pageLabel}</Text>
          </Flex>
          <Icon h={3} w={3}>
            <CaretUpDown />
          </Icon>
        </Flex>
      }
      menuTriggerProps={{
        py: 2,
        pl: 2,
        pr: 3,
      }}
      menuContent={menuContent}
      menuContentProps={{
        px: 2,
        pb: 2,
      }}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    />
  );
};
