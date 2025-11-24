// Already in the theme by default. Listing here for clarity/reference. https://www.chakra-ui.com/docs/theming/radii
// export const CI_DEFAULT_BORDER_RADIUS = {
// none: '0',          // 0px
// '2xs': '0.0625rem', // 1px
// xs: '0.125rem',     // 2px
// sm: '0.25rem',      // 4px
// md: '0.375rem',     // 6px
// lg: '0.5rem',       // 8px
// xl: '0.75rem',      // 12px
// '2xl': '1rem',      // 16px
// '3xl': '1.5rem',    // 24px
// '4xl': '2rem',      // 32px
// full: '9999px',     // 9999px
// };

export const CURRENT_BORDER_RADIUS = {};

export const NEW_BORDER_RADIUS = {
  redesign: {
    xxs: { value: '2px' },
    xs: { value: '4px' },
    sm: { value: '6px' },
    md: { value: '8px' },
    lg: { value: '12px' },
    xl: { value: '16px' },
    xxl: { value: '18px' },
    '2xl': { value: '20px' },
    '3xl': { value: '24px' },
    '4xl': { value: '32px' },
  },
};

export const BORDER_RADIUS = {
  ...NEW_BORDER_RADIUS,
  ...CURRENT_BORDER_RADIUS,
};
