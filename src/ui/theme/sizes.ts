import { SPACE } from './space';

// Already in the theme by default. Listing here for clarity/reference. https://chakra-ui-git-fix-typescript-autocomplete.chakra-ui.vercel.app/docs/theming/theme
// export const CI_DEFAULT_SIZES = {
//   //   ...theme.space, // imports all the space values
//   full: '100%',
//   '3xs': '14rem', // 224px
//   '2xs': '16rem', // 256px
//   xs: '20rem',    // 320px
//   sm: '24rem',    // 384px
//   md: '28rem',    // 448px
//   lg: '32rem',    // 512px
//   xl: '36rem',    // 576px
//   '2xl': '42rem', // 672px
//   '3xl': '48rem', // 768px
//   '4xl': '56rem', // 896px
//   '5xl': '64rem', // 1024px
//   '6xl': '72rem', // 1152px
// };

export const CURRENT_SIZES = {
  3.5: { value: '0.875rem' }, // 14px
  4.5: { value: '1.125rem' }, // 18px
  5.5: { value: '1.375rem' }, // 22px
  10.5: { value: '2.625rem' }, // 42px
  13: { value: '3.25rem' }, // 52px
  13.5: { value: '3.375rem' }, // 54px
  14: { value: '3.5rem' }, // 56px
  14.5: { value: '3.625rem' }, // 58px
  15: { value: '3.75rem' }, // 60px
  17: { value: '4.25rem' }, // 68px
  18: { value: '4.5rem' }, // 72px
  25: { value: '6.25rem' }, // 100px
  30: { value: '7.5rem' }, // 120px
  50: { value: '12.5rem' }, // 200px
  60: { value: '15rem' }, // 240px
  150: { value: '37.5rem' }, // 600px
};

export const NEW_SIZES = {
  ...SPACE,
};

export const SIZES = {
  //   ...NEW_SIZES, // TODO: BREAKING CHANGE!
  ...CURRENT_SIZES,
};
