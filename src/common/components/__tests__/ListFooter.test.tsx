import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ChakraProviderWrapper } from '../../utils/test-utils/render-utils';
import { ListFooter } from '../ListFooter';

describe('ListFooter', () => {
  it('offers to load more when there is a next page', () => {
    render(<ListFooter hasNextPage fetchNextPage={jest.fn()} label="transactions" />, {
      wrapper: ChakraProviderWrapper,
    });
    expect(screen.getByRole('button', { name: 'Load more transactions' })).toBeInTheDocument();
    expect(screen.queryByText('Failed to load more transactions.')).not.toBeInTheDocument();
  });

  it('shows the failure and turns the button into a retry when loading more failed', () => {
    const fetchNextPage = jest.fn();
    render(<ListFooter hasNextPage isError fetchNextPage={fetchNextPage} label="transactions" />, {
      wrapper: ChakraProviderWrapper,
    });
    expect(screen.getByText('Failed to load more transactions.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('hides the failure while the retry is loading', () => {
    render(
      <ListFooter hasNextPage isError isLoading fetchNextPage={jest.fn()} label="transactions" />,
      { wrapper: ChakraProviderWrapper }
    );
    expect(screen.queryByText('Failed to load more transactions.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeInTheDocument();
  });
});
