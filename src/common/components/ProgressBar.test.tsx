import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { screen } from '@testing-library/react';

import { ProgressBar } from './ProgressBar';

test.each([
  [25, '25'],
  [-10, '0'],
  [110, '100'],
  [undefined, '0'],
  [Number.NaN, null],
  [Number.POSITIVE_INFINITY, null],
])('exposes an accessible progress value for %s', (percentage, expected) => {
  renderWithChakraProviders(<ProgressBar percentage={percentage} />);
  const progress = screen.getByRole('progressbar', { name: 'Stacking cycle progress' });
  expect(progress).toHaveAttribute('aria-valuemin', '0');
  expect(progress).toHaveAttribute('aria-valuemax', '100');
  expect(progress.getAttribute('aria-valuenow')).toBe(expected);
});
