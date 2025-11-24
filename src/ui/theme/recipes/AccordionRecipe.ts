import { accordionAnatomy } from '@ark-ui/react';
import { defineSlotRecipe } from '@chakra-ui/react';

export const accordionSlotRecipe = defineSlotRecipe({
  className: 'chakra-accordion',
  slots: [...accordionAnatomy.keys(), 'itemBody'],
  base: {},

  variants: {
    variant: {
      primary: {
        itemTrigger: {
          px: 4,
          py: 3,
          bg: 'surfaceFourth',
          borderRadius: 'redesign.lg',
          _open: {
            borderBottomRadius: 'none',
          },
        },
        itemContent: {
          bg: 'surfaceFourth',
          py: 0,
          px: 'var(--accordion-padding-x)',
          borderBottomRadius: 'redesign.lg',
        },
        item: {
          borderRadius: 'redesign.lg',
        },
      },
    },

    size: {
      sm: {
        root: {
          '--accordion-padding-x': 'spacing.3',
          '--accordion-padding-y': 'spacing.2',
        },
        itemTrigger: {
          textStyle: 'sm',
          py: 'var(--accordion-padding-y)',
        },
      },
      md: {
        root: {
          '--accordion-padding-x': 'spacing.4',
          '--accordion-padding-y': 'spacing.2',
        },
        itemTrigger: {
          textStyle: 'md',
          py: 'var(--accordion-padding-y)',
        },
      },
      lg: {
        root: {
          '--accordion-padding-x': 'spacing.4.5',
          '--accordion-padding-y': 'spacing.2.5',
        },
        itemTrigger: {
          textStyle: 'lg',
          py: 'var(--accordion-padding-y)',
        },
      },
    },
  },

  defaultVariants: {},
});
