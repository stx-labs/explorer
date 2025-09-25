'use client';

import { defineRecipe } from '@chakra-ui/react';

export const buttonRecipe = defineRecipe({
  base: {},
  variants: {
    variant: {
      primary: {
        fontWeight: 'semibold',
        fontSize: 'sm',
        color: { base: '{colors.neutral.white}', _dark: '{colors.neutral.black}' },
        bg: { base: '{colors.purple.600}', _dark: '{colors.purple.400}' },
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
          bg: { base: '{colors.purple.700}', _dark: '{colors.purple.500}' },
        },
      },
      secondary: {
        height: 12,
        fontWeight: 'medium',
        fontSize: 'sm',
        color: { base: '{colors.neutral.black}', _dark: '{colors.neutral.white}' },
        border: '1px solid {colors.borderSecondary}',
        bg: 'surface',
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
          bg: { base: '{colors.slate.200}', _dark: '{colors.slate.900}' },
        },
      },
      text: {
        padding: '0 !important',
        border: 'none',
        background: 'none',
        fontWeight: 'medium',
        fontSize: 'sm',
        color: 'buttonText',
        height: 'auto',
        _hover: {
          textDecoration: 'underline',
          bg: 'none',
        },
      },
      wrapper: {
        padding: '0 !important',
        border: 'none',
        background: 'none',
        h: 'fit-content',
        w: 'fit-content',
        minW: 'fit-content',
        minH: 'fit-content',
        _hover: {
          textDecoration: 'underline',
          bg: 'none',
        },
      },
      redesignPrimary: {
        fontFamily: 'var(--font-instrument-sans)',
        borderRadius: 'redesign.md',
        color: {
          base: '{colors.neutral.sand-50}',
          _dark: '{colors.neutral.sand-1000}',
        },
        bg: {
          base: '{colors.neutral.sand-700}',
          _dark: '{colors.neutral.sand-50}',
        },
        _hover: {
          bg: {
            base: '{colors.neutral.sand-1000}',
            _dark: '{colors.neutral.sand-200}',
          },
        },
        _disabled: {
          color: {
            base: '{colors.neutral.sand-200}',
            _dark: '{colors.neutral.sand-300}',
          },
          bg: {
            base: '{colors.neutral.sand-400}',
            _dark: '{colors.neutral.sand-500}',
          },
        },
      },
      redesignSecondary: {
        fontFamily: 'var(--font-instrument-sans)',
        borderRadius: 'redesign.md',
        color: {
          base: '{colors.neutral.sand-50}',
          _dark: '{colors.neutral.sand-1000}',
        },
        bg: {
          base: '{colors.neutral.sand-500}',
          _dark: '{colors.neutral.sand-300}',
        },
        _hover: {
          bg: {
            base: '{colors.neutral.sand-600}',
            _dark: '{colors.neutral.sand-400}',
          },
        },
        _disabled: {
          color: {
            base: '{colors.neutral.sand-100}',
            _dark: '{colors.neutral.sand-400}',
          },
          bg: {
            base: '{colors.neutral.sand-300}',
            _dark: '{colors.neutral.sand-600}',
          },
        },
      },
      redesignTertiary: {
        border: '2px solid var(--stacks-colors-redesign-border-secondary)',
        borderRadius: 'redesign.md',
        bg: 'transparent',
        color: { base: '{colors.neutral.sand-600}', _dark: '{colors.neutral.sand-150}' },
        _hover: {
          background: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-700}' },
        },
        _disabled: {
          color: {
            base: '{colors.neutral.sand-300}',
            _dark: '{colors.neutral.sand-500}',
          },
        },
      },
      redesignWarning: {
        borderRadius: 'redesign.md',
        color: '{colors.neutral.sand-50}',
        bg: {
          base: '{colors.feedback.red-500}',
          _dark: '{colors.feedback.red-500}',
        },
        _hover: {
          bg: '{colors.feedback.red-600}',
        },
        _disabled: {
          color: {
            base: '{colors.neutral.sand-500}',
            _dark: '{colors.neutral.sand-300}',
          },
          bg: {
            base: '{colors.feedback.red-300}',
            _dark: '{colors.feedback.red-600}',
          },
        },
      },
      unstyled: {
        bg: 'transparent',
        border: 'none',
        borderRadius: 'none',
        p: 0,
        textDecoration: 'none',
        minH: 0,
        minW: 0,
      },
      buttonLink: {
        h: 'auto',
        bg: 'transparent',
        border: 'none',
        borderRadius: 'none',
        p: 0,
        pb: 0.5,
        textDecoration: 'none !important',
        fontFamily: 'var(--font-instrument-sans)',
        color: 'textPrimary',
        borderBottom: '2px solid',
        borderColor: 'redesignBorderSecondary',
        _hover: {
          bg: 'transparent',
          textDecoration: 'none',
          borderBottomColor: 'redesignBorderPrimary',
        },
        _disabled: {
          textDecoration: 'none',
          color: 'textTertiary',
        },
      },
    },
    size: {
      small: {
        fontSize: 'xs',
        fontWeight: 'medium',
        py: 2,
        px: 3,
        h: 8,
      },
      big: {
        fontSize: 'sm',
        fontWeight: 'medium',
        py: 3,
        px: 4,
        h: 10,
      },
    },
  },
  defaultVariants: {
    // variant: 'primary',
  },
});
