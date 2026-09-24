'use client';

import { Flex, Grid, HStack, Icon } from '@chakra-ui/react';
import { List, User } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

import { Circle } from '../../common/components/Circle';
import { Section } from '../../common/components/Section';
import { useGlobalContext } from '../../common/context/useGlobalContext';
import { useAppDispatch, useAppSelector } from '../../common/state/hooks';
import { NetworkModes } from '../../common/types/network';
import { getQueryParams } from '../../common/utils/buildUrl';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Caption } from '../../ui/typography';
import { PageTitle } from '../_components/PageTitle';
import { useUser } from './hooks/useUser';
import { ConnectToStacks } from './layout/ConnectToStacks';
import { RightPanelSkeleton } from './layout/RightPanelSkeleton';
import { SideNav } from './layout/SideNav';
import { selectShowRightPanel, toggleRightPanel } from './sandbox-slice';

const RightPanel = dynamic(() => import('./layout/RightPanel').then(mod => mod.RightPanel), {
  ssr: false,
  loading: () => <RightPanelSkeleton />,
});

export const FAUCET_PATHNAME = '/sandbox/faucet';

export function getRequiresWallet(pathname: string | null | undefined) {
  return pathname !== FAUCET_PATHNAME;
}

export function Wrapper({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { isConnected, userData, connect, stxAddress } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const requiresWallet = getRequiresWallet(pathname);
  const { activeNetwork } = useGlobalContext();
  const showRightPanel = useAppSelector(selectShowRightPanel);

  if (activeNetwork.isSubnet) {
    void router.replace(`/${getQueryParams(activeNetwork)}`);
    return null;
  }

  if (!requiresWallet && activeNetwork.mode === NetworkModes.Mainnet) {
    void router.replace(`/sandbox/deploy${getQueryParams(activeNetwork)}`);
    return null;
  }

  return (
    <>
      <PageTitle>Sandbox</PageTitle>
      <Section
        px={0}
        title={
          <Flex height={6} alignItems={'center'}>
            Stacks Explorer Sandbox
          </Flex>
        }
        topRight={
          !isConnected ? (
            <Button onClick={connect} size="xs" fontSize="xs" variant="secondary" height={8}>
              Connect Stacks Wallet
            </Button>
          ) : (
            <HStack gap={6}>
              <HStack alignItems="center">
                <Circle h={5} w={5} color="borderSecondary">
                  <Icon h={3.5} w={3.5} color="surfaceOpposite">
                    <User />
                  </Icon>
                </Circle>
                <Caption>{stxAddress}</Caption>
                <IconButton
                  onClick={() => dispatch(toggleRightPanel())}
                  aria-label={'Toggle right panel'}
                  size={4}
                  color="surfaceOpposite"
                >
                  <List />
                </IconButton>
              </HStack>
            </HStack>
          )
        }
      >
        <Grid
          gridTemplateColumns={'var(--stacks-sizes-16) minmax(0, 1fr)'}
          gap={0}
          minHeight={'768px'}
        >
          <SideNav />
          {isConnected || !requiresWallet ? children : <ConnectToStacks />}
          {showRightPanel ? <RightPanel /> : null}
        </Grid>
      </Section>
    </>
  );
}
