import { Stack } from '@chakra-ui/react';
import type { StackProps } from '@chakra-ui/react';

export function ChartTooltipSurface({ children, ...props }: StackProps) {
  return (
    <Stack
      bg={{ base: 'alpha.black-alpha-700', _dark: 'alpha.sand-alpha-400' }}
      backdropFilter="blur(8px)"
      borderRadius="redesign.sm"
      {...props}
    >
      {children}
    </Stack>
  );
}
