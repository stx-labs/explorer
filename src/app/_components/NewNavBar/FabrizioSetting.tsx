'use client';

import { useFabrizio } from '@/common/context/FabrizioContext';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/ui/Text';
import { Box, ClientOnly, Flex } from '@chakra-ui/react';

export const FabrizioSettingBase = () => {
  const { isEnabled, toggle } = useFabrizio();

  return (
    <Flex alignItems="center" justifyContent="space-between" gap={8} minW={220}>
      <Box lineHeight="redesign.short">
        <Text color="textPrimary" fontSize={{ base: 'sm', lg: 'xs' }} fontWeight="medium">
          🍕 Fabrizio Mode
        </Text>
        <Text color="textSecondary" fontSize={{ base: 'sm', lg: 'xs' }}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Text>
      </Box>
      <Switch
        checked={isEnabled}
        onCheckedChange={() => toggle()}
        variant="redesignPrimary"
        size="small"
      />
    </Flex>
  );
};

export const FabrizioSetting = () => (
  <ClientOnly>
    <FabrizioSettingBase />
  </ClientOnly>
);
