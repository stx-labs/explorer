'use client';

import { defineRecipe } from '@chakra-ui/react';

export const iconButtonRecipe = defineRecipe({
  base: {
    bg: 'transparent',
    _hover: { bg: 'rgba(255, 255, 255, 0.15)' },
    borderRadius: 'full',
  },
  variants: {
    variant: {
      primary: {
        bg: 'transparent',
        _hover: { bg: 'rgba(255, 255, 255, 0.15)' },
        borderRadius: 'full',
      },
      redesignPrimary: {
        bg: 'transparent',
        borderRadius: 'redesign.sm',
        _hover: { bg: 'surfaceInvert', _icon: { color: 'iconInvert' } },
        _icon: {
          color: 'iconSecondary',
        },
      },
      redesignSecondary: {
        bg: 'surfacePrimary !important',
        borderRadius: 'redesign.sm',
        _hover: {
          bg: 'surfaceFifth !important',
        },
        _icon: {
          color: 'iconSecondary',
        },
      },
    },
    size: {
      '2xs': {
        h: '6',
        minW: '6',
        textStyle: 'xs',
        px: '2',
        gap: '1',
        _icon: {
          width: '3.5',
          height: '3.5',
        },
      },
      xs: {
        h: 8,
        minW: 8,
        textStyle: 'xs',
        p: 2.5,
        _icon: {
          width: 4,
          height: 4,
        },
      },
      sm: {
        h: '9',
        minW: '9',
        px: '3.5',
        textStyle: 'sm',
        gap: '2',
        _icon: {
          width: '4',
          height: '4',
        },
      },
      md: {
        h: '10',
        minW: '10',
        textStyle: 'sm',
        px: '4',
        gap: '2',
        _icon: {
          width: '5',
          height: '5',
        },
      },
      lg: {
        h: '11',
        minW: '11',
        textStyle: 'md',
        px: '5',
        gap: '3',
        _icon: {
          width: '5',
          height: '5',
        },
      },
      xl: {
        h: '12',
        minW: '12',
        textStyle: 'md',
        px: '5',
        gap: '2.5',
        _icon: {
          width: '5',
          height: '5',
        },
      },
      '2xl': {
        h: '16',
        minW: '16',
        textStyle: 'lg',
        px: '7',
        gap: '3',
        _icon: {
          width: '6',
          height: '6',
        },
      },
    },
  },
});
