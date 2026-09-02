import { Box, BoxProps, Stack } from '@chakra-ui/react';

/**
 * The progress line used for the Stacking cycle on the home page. Shared so
 * every cycle or term that fills up over time is drawn the same way.
 */
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

export function ProgressBar({ percentage }: { percentage?: number }) {
  const PROGRESS_KNOB_DIAMETER = 1;
  return (
    <Stack
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
        w={`${percentage}%`}
        position="absolute"
        boxShadow={'0px 2px 10px 0px rgba(255, 85, 18, 0.50)'}
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
