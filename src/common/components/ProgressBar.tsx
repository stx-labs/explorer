import { Box, Stack } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';

const PROGRESS_KNOB_DIAMETER = 1;

function ProgressKnob({ diameter, ...boxProps }: { diameter: number } & BoxProps) {
  return (
    <Box
      bg={{ base: 'white', _dark: 'neutral.sand-900' }}
      h={diameter}
      w={diameter}
      borderRadius={'redesign.2xl'}
      position="absolute"
      top="50%"
      bottom="50%"
      m="auto"
      {...boxProps}
    />
  );
}

export function ProgressBar({ percentage = 0 }: { percentage?: number }) {
  const safePercentage = Number.isFinite(percentage) ? percentage : 0;
  const progress = Math.min(Math.max(safePercentage, 0), 100);
  return (
    <Stack
      role="progressbar"
      aria-label="Stacking cycle progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Number.isFinite(percentage) ? progress : undefined}
      bg={{
        base: 'neutral.sand-200',
        _dark: 'neutral.sand-700',
      }}
      h={2}
      borderRadius={'redesign.xl'}
      w="100%"
      position="relative"
    >
      <Stack
        bg={'accent.stacks-500'}
        h={2}
        borderRadius={'redesign.2xl'}
        w={`${progress}%`}
        position="absolute"
        boxShadow="brandGlow"
      />
      <ProgressKnob
        diameter={PROGRESS_KNOB_DIAMETER}
        left={`calc(var(--stacks-spacing-${PROGRESS_KNOB_DIAMETER}) / 2)`}
      />
      <ProgressKnob
        diameter={PROGRESS_KNOB_DIAMETER}
        right={`calc(var(--stacks-spacing-${PROGRESS_KNOB_DIAMETER}) / 2)`}
      />
    </Stack>
  );
}
