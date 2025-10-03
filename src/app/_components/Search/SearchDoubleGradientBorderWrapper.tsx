import { Flex, FlexProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

const transition = 'opacity 0.3s cubic-bezier(0.48, 0, 0.83, 0.67)';
const outerBorderWidth = 5;

const outerBorderCommonStyle = {
  content: '""',
  position: 'absolute',
  top: `-${outerBorderWidth}px`,
  left: `-${outerBorderWidth}px`,
  right: `-${outerBorderWidth}px`,
  bottom: `-${outerBorderWidth}px`,
  borderRadius: `calc(var(--stacks-radii-redesign-lg) + ${outerBorderWidth}px)`,
  zIndex: 1,
  transition,
};

const outerBorderDefaultStyle = {
  ...outerBorderCommonStyle,
  background: {
    base: 'var(--stacks-colors-alpha-black-alpha-50)',
    _dark: 'var(--stacks-colors-alpha-sand-alpha-200)',
  },
};

const gradientOuterBorderStyle = {
  ...outerBorderCommonStyle,
  background: {
    base: 'linear-gradient(0deg, var(--stacks-colors-accent-stacks-500) 0%, var(--stacks-colors-accent-bitcoin-500) 100%)',
    _dark:
      'linear-gradient(0deg, var(--stacks-colors-accent-stacks-600) 0%, var(--stacks-colors-accent-bitcoin-600) 100%)',
  },
  opacity: 0,
};

const innerBorderWidth = 1;

const innerBorderCommonStyle = {
  content: '""',
  position: 'absolute',
  top: `-${innerBorderWidth}px`,
  left: `-${innerBorderWidth}px`,
  right: `-${innerBorderWidth}px`,
  bottom: `-${innerBorderWidth}px`,
  borderRadius: `calc(var(--stacks-radii-redesign-lg) + ${innerBorderWidth}px)`,
  zIndex: 2,
  transition,
};

const innerBorderDefaultStyle = {
  ...innerBorderCommonStyle,
  background:
    'linear-gradient(0deg, var(--stacks-colors-redesign-border-primary), var(--stacks-colors-redesign-border-primary) 100%)',
};

const gradientInnerBorderStyle = {
  ...innerBorderCommonStyle,
  background: {
    base: 'linear-gradient(0deg, var(--stacks-colors-accent-stacks-400) 0%, var(--stacks-colors-accent-bitcoin-300) 100%)',
    _dark:
      'linear-gradient(0deg, var(--stacks-colors-accent-stacks-500) 0%, var(--stacks-colors-accent-bitcoin-600) 100%)',
  },
  opacity: 0,
};

const visibleGradientBorderStyle = {
  '&:after': {
    opacity: 0,
  },
  '&:before': {
    opacity: 0,
  },
  '& .border-highlight': {
    '&:after': {
      opacity: {
        base: 0.15,
        _dark: 0.3,
      },
    },
    '&:before': {
      opacity: 1,
    },
  },
};

export function SearchDoubleGradientBorderWrapper({
  children,
  ...flexProps
}: { children: ReactNode } & FlexProps) {
  return (
    <Flex
      width={'full'}
      borderRadius="redesign.lg"
      _after={outerBorderDefaultStyle}
      _before={innerBorderDefaultStyle}
      flex="1"
      _hover={visibleGradientBorderStyle}
      _focusWithin={visibleGradientBorderStyle}
      {...flexProps}
    >
      <Flex
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        className="border-highlight"
        borderRadius="redesign.lg"
        _after={gradientOuterBorderStyle}
        _before={gradientInnerBorderStyle}
      ></Flex>
      {children}
    </Flex>
  );
}
