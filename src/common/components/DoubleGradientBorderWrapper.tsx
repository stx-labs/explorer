import { Box, Flex, FlexProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

const transition = 'opacity 0.3s cubic-bezier(0.48, 0, 0.83, 0.67)';
const OUTER_BORDER_WIDTH = 5;
const INNER_BORDER_WIDTH = 1;

const CONTENT_Z_INDEX = 2;
const INNER_BORDER_Z_INDEX = CONTENT_Z_INDEX - 1;
const OUTER_BORDER_Z_INDEX = INNER_BORDER_Z_INDEX - 1;

const outerBorderCommonStyle = {
  content: '""',
  position: 'absolute',
  top: `-${OUTER_BORDER_WIDTH}px`,
  left: `-${OUTER_BORDER_WIDTH}px`,
  right: `-${OUTER_BORDER_WIDTH}px`,
  bottom: `-${OUTER_BORDER_WIDTH}px`,
  borderRadius: `calc(var(--stacks-radii-redesign-lg) + ${OUTER_BORDER_WIDTH}px)`,
  zIndex: OUTER_BORDER_Z_INDEX,
  transition,
};

const innerBorderCommonStyle = {
  content: '""',
  position: 'absolute',
  top: `-${INNER_BORDER_WIDTH}px`,
  left: `-${INNER_BORDER_WIDTH}px`,
  right: `-${INNER_BORDER_WIDTH}px`,
  bottom: `-${INNER_BORDER_WIDTH}px`,
  borderRadius: `calc(var(--stacks-radii-redesign-lg) + ${INNER_BORDER_WIDTH}px)`,
  zIndex: INNER_BORDER_Z_INDEX,
  transition,
};

const gradientOuterBorderStyle = {
  ...outerBorderCommonStyle,
  bg: {
    base: 'linear-gradient(0deg, var(--stacks-colors-accent-stacks-500) 0%, var(--stacks-colors-accent-bitcoin-500) 100%)',
    _dark:
      'linear-gradient(0deg, var(--stacks-colors-accent-stacks-600) 0%, var(--stacks-colors-accent-bitcoin-600) 100%)',
  },
  opacity: {
    base: 0.15,
    _dark: 0.3,
  },
};

const gradientInnerBorderStyle = {
  ...innerBorderCommonStyle,
  background: {
    base: 'linear-gradient(0deg, var(--stacks-colors-accent-stacks-400) 0%, var(--stacks-colors-accent-bitcoin-300) 100%)',
    _dark:
      'linear-gradient(0deg, var(--stacks-colors-accent-stacks-500) 0%, var(--stacks-colors-accent-bitcoin-600) 100%)',
  },
};

export function DoubleGradientBorderWrapper({
  children,
  ...flexProps
}: { children: ReactNode } & FlexProps) {
  return (
    <Flex
      position="relative"
      top={0}
      left={0}
      right={0}
      bottom={0}
      borderRadius="redesign.lg"
      _after={gradientOuterBorderStyle}
      _before={gradientInnerBorderStyle}
      {...flexProps}
      opacity={1}
    >
      <Box zIndex={CONTENT_Z_INDEX} bg="surfaceTertiary" borderRadius="redesign.lg">
        {children}
      </Box>
    </Flex>
  );
}
