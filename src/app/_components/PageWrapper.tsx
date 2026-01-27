'use client';

import { Box, Flex, Stack } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { AddNetworkModal } from '../../common/components/modals/AddNetwork';
import { AddNetworkModalNew } from '../../common/components/modals/AddNetworkNew';
import { IncidentContent } from '../../common/types/incidents';
import { BtcStackingOverlay } from '../../components/btc-stacking/BtcStackingOverlay';
import { FabrizioOverlay } from '../../components/fabrizio/FabrizioOverlay';
import { NotFabrizioOverlay } from '../../components/fabrizio/NotFabrizioOverlay';
import { TestnetBanner } from './Banner/TestnetBanner';
import { NetworkModeToast } from './NetworkModeToast';
import { NewFooter } from './NewFooter';
import { NavBar as NewNavBar } from './NewNavBar/NavBar';
import { CMSStatusBars } from './StatusBar/CMSStatusBars';
import { IncidentsStatusBar } from './StatusBar/IncidentsStatusBar';
import { NonHiroNetworkWarningBar } from './StatusBar/NonHiroNetworkWarningBar';

export function PageWrapper({
  children,
  statusBarContent,
}: {
  children: ReactNode;
  statusBarContent: IncidentContent | null;
}) {
  return (
    <>
      <Stack gap={0} top={0} w="full" className="banner-area">
        <NonHiroNetworkWarningBar />
        <IncidentsStatusBar />
        <CMSStatusBars statusBarContent={statusBarContent} />
        <TestnetBanner />
      </Stack>
      <Stack
        className="page-layout"
        bg="surfaceTertiary"
        maxWidth="100vw"
        minHeight="100vh"
        overflow="hidden"
        fontVariantLigatures="no-contextual"
      >
        <Stack
          className="page-content-layout"
          height="full"
          minHeight="100vh"
          width="full"
          maxWidth="breakpoint-2xl"
          p={6}
          mx="auto"
          justifyContent="space-between"
        >
          <Box className="navbar-content-wrapper" h="full" w="full">
            <NewNavBar />
            <Stack
              className="page-content-spacing"
              marginTop={'50px'}
              mb={8}
              gap={7} // TODO: not sure I like putting these spacing styles here. This forces all pages to use fragments. This gap creates the space between the major components on the page.
            >
              {children}
            </Stack>
          </Box>
          <Flex className="footer-position" w="full">
            <NewFooter />
          </Flex>
        </Stack>
      </Stack>
      <AddNetworkModal />
      <AddNetworkModalNew />
      <NetworkModeToast />
      <FabrizioOverlay />
      <NotFabrizioOverlay />
      <BtcStackingOverlay />
    </>
  );
}
