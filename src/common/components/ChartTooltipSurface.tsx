import { useColorMode } from '@/components/ui/color-mode';
import { Stack } from '@chakra-ui/react';
import type { StackProps } from '@chakra-ui/react';

export function ChartTooltipSurface({ children, ...props }: StackProps) {
  const { colorMode } = useColorMode();

  return (
    <Stack
      bg={
        colorMode === 'light'
          ? 'var(--stacks-colors-alpha-black-alpha-700)'
          : 'var(--stacks-colors-alpha-sand-alpha-400)'
      }
      backdropFilter="blur(8px)"
      borderRadius="redesign.sm"
      {...props}
    >
      {children}
    </Stack>
  );
}
