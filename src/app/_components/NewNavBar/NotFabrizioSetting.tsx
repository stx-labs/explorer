'use client';

import { useFabrizio } from '@/common/context/FabrizioContext';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/ui/Text';
import { Box, ClientOnly, Flex } from '@chakra-ui/react';

export const NotFabrizioSettingBase = () => {
  const { isEnabled, showNotFabrizio, toggleNotFabrizio } = useFabrizio();

  // Only show this setting when Fabrizio Mode is enabled
  if (!isEnabled) {
    return null;
  }

  return (
    <Flex alignItems="center" justifyContent="space-between" gap={8} minW={220}>
      <Box lineHeight="redesign.short">
        <Text color="textPrimary" fontSize={{ base: 'sm', lg: 'xs' }} fontWeight="medium">
          🍍 Show "not Fabrizio"
        </Text>
        <Text color="textSecondary" fontSize={{ base: 'sm', lg: 'xs' }}>
          {showNotFabrizio ? 'Enabled' : 'Disabled'}
        </Text>
      </Box>
      <Switch
        checked={showNotFabrizio}
        onCheckedChange={() => toggleNotFabrizio()}
        variant="redesignPrimary"
        size="small"
      />
    </Flex>
  );
};

export const NotFabrizioSetting = () => (
  <ClientOnly>
    <NotFabrizioSettingBase />
  </ClientOnly>
);
