// Already in the theme by default. Listing here for clarity/reference. https://chakra-ui-git-fix-typescript-autocomplete.chakra-ui.vercel.app/docs/theming/theme
// export const CI_DEFAULT_SPACE = {
//   0.5: '0.125rem', // 2px
//   1: '0.25rem', // 4px
//   1.5: '0.375rem', // 6px
//   2: '0.5rem', // 8px
//   2.5: '0.625rem', // 10px
//   3: '0.75rem', // 12px
//   3.5: '0.875rem', // 14px
//   4: '1rem', // 16px
//   4.5: '1.125rem', // 18px
//   5: '1.25rem', // 20px
//   6: '1.5rem', // 24px
//   7: '1.75rem', // 28px
//   8: '2rem', // 32px
//   9: '2.25rem', // 36px
//   10: '2.5rem', // 40px
//   11: '2.75rem', // 44px
//   12: '3rem', // 48px
//   14: '3.5rem', // 56px
//   16: '4rem', // 64px
//   20: '5rem', // 80px
//   24: '6rem', // 96px
//   28: '7rem', // 112px
//   32: '8rem', // 128px
//   36: '9rem', // 144px
//   40: '10rem', // 160px
//   44: '11rem', // 176px
//   48: '12rem', // 192px
//   52: '13rem', // 208px
//   56: '14rem', // 224px
//   60: '15rem', // 240px
//   64: '16rem', // 256px
//   72: '18rem', // 288px
//   80: '20rem', // 320px
//   96: '24rem', // 384px
// };

export const CURRENT_SPACE = {};

export const NEW_SPACE = {
  0: { value: '0px' },
  1: { value: '0.25rem' }, // 4px
  2: { value: '0.5rem' }, // 8px
  3: { value: '0.75rem' }, // 12px
  3.5: { value: '0.875rem' }, // 14px
  4: { value: '1rem' }, // 16px
  4.5: { value: '1.125rem' },
  5: { value: '1.25rem' }, // 20px
  6: { value: '1.5rem' }, // 24px
  7: { value: '1.75rem' }, // 28px
  7.5: { value: '1.875rem' }, // 30px
  8: { value: '2rem' }, // 32px
  8.5: { value: '2.125rem' }, // 34px
  9: { value: '2.25rem' }, // 36px
  10: { value: '2.5rem' }, // 40px
  11: { value: '2.75rem' }, // 44px
  11.25: { value: '2.875rem' }, // 46px
  11.5: { value: '2.875rem' }, // 46px
  12: { value: '3rem' }, // 48px
  13: { value: '3.25rem' }, // 52px
  14: { value: '3.5rem' }, // 56px
  15: { value: '3.75rem' }, // 60px
  16: { value: '4rem' }, // 64px
  17: { value: '4.25rem' }, // 68px
  18: { value: '4.5rem' }, // 72px
  20: { value: '5rem' }, // 80px
  24: { value: '6rem' }, // 96px
  25: { value: '6.25rem' }, // 100px
  26: { value: '6.5rem' }, // 104px
  27: { value: '6.75rem' }, // 108px
  27.5: { value: '6.875rem' }, // 108px
  28: { value: '7rem' }, // 112px
  32: { value: '8rem' }, // 128px
  36: { value: '9rem' }, // 144px
  40: { value: '10rem' }, // 160px
  44: { value: '11rem' }, // 176px
  48: { value: '12rem' }, // 192px
  52: { value: '13rem' }, // 208px
  56: { value: '14rem' }, // 224px
  60: { value: '15rem' }, // 240px
  64: { value: '16rem' }, // 256px
  72: { value: '18rem' }, // 288px
  80: { value: '20rem' }, // 320px
  96: { value: '24rem' }, // 384px
};

export const SPACE = {
  ...NEW_SPACE,
  ...CURRENT_SPACE,
};
