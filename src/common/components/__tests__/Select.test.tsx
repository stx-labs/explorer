import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';

import { Select } from '../Select';

const items = [
  { value: 'first', label: 'First option' },
  { value: 'second', label: 'Second option' },
];

describe('Select', () => {
  const resizeObserver = global.ResizeObserver;

  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  });

  afterAll(() => {
    global.ResizeObserver = resizeObserver;
  });

  it('supports a controlled value', () => {
    const { getByRole, rerender } = renderWithChakraProviders(
      <Select items={items} label="Test select" defaultValue={['second']} value={['first']} />
    );

    expect(getByRole('combobox', { name: 'Test select' })).toHaveTextContent('First option');

    rerender(<Select items={items} label="Test select" value={['second']} />);

    expect(getByRole('combobox', { name: 'Test select' })).toHaveTextContent('Second option');
  });
});
