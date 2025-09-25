'use client';

import { defineSlotRecipe } from '@chakra-ui/react';

export const switchSlotRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'thumb', 'indicator'],
  className: 'chakra-switch',
  base: {
    root: {},
    thumb: {
      bg: { base: '{colors.neutral.white}', _dark: '{colors.neutral.black}' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transitionProperty: 'translate',
      transitionDuration: 'fast',
      borderRadius: 'inherit',
      _checked: {
        translate: 'var(--switch-x) 0',
      },
      width: 'var(--switch-height)',
      height: 'var(--switch-height)',
      scale: '0.8',
      boxShadow: 'sm',
    },
    control: {},
    label: {},
  },
  variants: {
    variant: {
      primary: {
        root: {},
        thumb: {
          bg: { base: '{colors.neutral.white}', _dark: '{colors.neutral.black}' },
        },
        control: {
          bg: { base: '{colors.slate.200}', _dark: '{colors.slate.800}' },

          _checked: {
            bg: { base: '{colors.purple.600}', _dark: '{colors.purple.400}' },
          },
        },
        label: {},
      },
      redesignPrimary: {
        root: {},
        thumb: {
          bg: 'surfaceTertiary',
          boxShadow: 'elevation1',
        },
        control: {
          bg: 'surfaceFifth',

          _checked: {
            bg: 'surfaceInvert',
          },
        },
        label: {},
      },
    },
    size: {
      small: {
        root: {
          '--switch-width': '42px',
          '--switch-height': '24px',
          '--switch-indicator-font-size': 'fontSizes.xs',
        },
      },
      large: {
        root: {
          '--switch-width': 14,
          '--switch-height': 8,
          '--switch-indicator-font-size': 'fontSizes.sm',
        },
      },
    },
  },
  defaultVariants: {
    // variant: 'primary',
  },
});
