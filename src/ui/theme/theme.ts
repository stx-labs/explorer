'use client';

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

import { BORDER_RADIUS } from './borderRadius';
import { BORDERS } from './borders';
import { BREAKPOINTS } from './breakpoints';
import { COLORS, NEW_COLORS } from './colors';
import { FONT_SIZES } from './fontSizes';
import { FONT_WEIGHTS } from './fontWeights';
import { FONTS } from './fonts';
import { LETTER_SPACINGS } from './letterSpacings';
import { LINEHEIGHTS } from './lineHeights';
import { alertSlotRecipe } from './recipes/AlertRecipe';
import { badgeRecipe } from './recipes/BadgeRecipe';
import { buttonRecipe } from './recipes/ButtonRecipe';
import { checkboxSlotRecipe } from './recipes/CheckboxRecipe';
import { dialogSlotRecipe } from './recipes/DialogRecipe';
import { iconButtonRecipe } from './recipes/IconButtonRecipe';
import { inputRecipe } from './recipes/InputRecipe';
import { kbdRecipe } from './recipes/KbdRecipe';
import { linkRecipe } from './recipes/LinkRecipe';
import { menuSlotRecipe } from './recipes/MenuRecipe';
import { popoverSlotRecipe } from './recipes/PopoverRecipe';
import { selectSlotRecipe } from './recipes/SelectRecipe';
import { switchSlotRecipe } from './recipes/SwitchRecipe';
import { tabsSlotRecipe } from './recipes/TabsRecipe';
import { tagSlotRecipe } from './recipes/TagRecipe';
import { textareaRecipe } from './recipes/TextareaRecipe';
import { tooltipSlotRecipe } from './recipes/TooltipRecipe';
import { SEMANTIC_TOKENS } from './semanticTokens';
import { SIZES } from './sizes';
import { SPACE } from './space';
import { TEXT_STYLES } from './textStyles';
import { Z_INDEX } from './zIndex';

const explorerConfig = defineConfig({
  cssVarsPrefix: 'stacks',
  // strictTokens: true, // enforces the usage of only design tokens
});

const themeConfig = {
  theme: {
    recipes: {
      button: buttonRecipe,
      link: linkRecipe,
      badge: badgeRecipe,
      iconButton: iconButtonRecipe,
      input: inputRecipe,
      kbd: kbdRecipe,
      textarea: textareaRecipe,
    },
    slotRecipes: {
      checkbox: checkboxSlotRecipe,
      menu: menuSlotRecipe,
      switch: switchSlotRecipe,
      tabs: tabsSlotRecipe,
      tag: tagSlotRecipe,
      tooltip: tooltipSlotRecipe,
      dialog: dialogSlotRecipe,
      popover: popoverSlotRecipe,
      alert: alertSlotRecipe,
      select: selectSlotRecipe,
    },
    tokens: {
      colors: { ...COLORS, ...NEW_COLORS },
      letterSpacings: {
        ...LETTER_SPACINGS,
      },
      lineHeights: {
        ...LINEHEIGHTS,
      },
      zIndex: {
        ...Z_INDEX,
      },
      fonts: {
        ...FONTS,
      },
      fontSizes: {
        ...FONT_SIZES,
      },
      fontWeights: {
        ...FONT_WEIGHTS,
      },
      sizes: {
        ...SIZES,
      },
      spacing: {
        ...SPACE,
      },
      borders: {
        ...BORDERS,
      },
      radii: {
        ...BORDER_RADIUS,
      },
    },
    semanticTokens: {
      ...SEMANTIC_TOKENS,
    },
    textStyles: {
      ...TEXT_STYLES,
    },
    breakpoints: {
      ...BREAKPOINTS,
    },
  },
};

export const system = createSystem(defaultConfig, explorerConfig, themeConfig);
