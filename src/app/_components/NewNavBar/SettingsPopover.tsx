import {
  TabPopoverContent,
  TabPopoverRoot,
  TabPopoverTrigger,
} from '@/common/components/TabPopover';
import { Box, Flex, Icon, PopoverRootProps, Separator, Stack } from '@chakra-ui/react';
import { GearFine, X } from '@phosphor-icons/react';
import { useState } from 'react';

import { CurrencySetting } from './CurrencySetting';
import { NetworkSetting } from './NetworkSetting';
import { ThemeSetting } from './ThemeSetting';

export const SettingsPopoverContent = ({ isOpen }: { isOpen?: boolean }) => {
  return (
    <Stack
      w={{ base: 'full', lg: 'fit-content' }}
      p={4}
      borderRadius="redesign.lg"
      borderTopRightRadius={{ base: 'redesign.lg', lg: 'none' }}
      border="none"
      bg="surfacePrimary"
      separator={<Separator borderColor="redesignBorderSecondary" />}
      gap={3}
      fontFamily="var(--font-instrument-sans)"
      boxShadow={{ base: 'none', lg: isOpen ? 'var(--stacks-shadows-elevation2)' : 'none' }}
    >
      <ThemeSetting />
      {/* <CurrencySetting /> */}
      <NetworkSetting />
    </Stack>
  );
};

const POSITIONING: PopoverRootProps['positioning'] = {
  placement: 'bottom-end',
  offset: {
    mainAxis: 8,
  },
};

export const SettingsPopover = () => {
  const [open, setOpen] = useState(false);

  return (
    <TabPopoverRoot
      id="settings-popover"
      positioning={POSITIONING}
      open={open}
      onOpenChange={e => setOpen(e.open)}
      lazyMount
    >
      <TabPopoverTrigger open={open} positioning={POSITIONING}>
        <Box
          bg="surfacePrimary"
          borderRadius="redesign.lg"
          borderBottomRadius={open ? 'none' : 'redesign.lg'}
          cursor="pointer"
          className="group"
        >
          <Flex alignItems="center" justifyContent="center" top={0} h={10} w={10}>
            <Icon h={4} w={4} color="iconSecondary" _groupHover={{ color: 'iconPrimary' }}>
              {open ? <X /> : <GearFine />}
            </Icon>
          </Flex>
        </Box>
      </TabPopoverTrigger>
      <TabPopoverContent positioning={POSITIONING}>
        <SettingsPopoverContent isOpen={open} />
      </TabPopoverContent>
    </TabPopoverRoot>
  );
};
