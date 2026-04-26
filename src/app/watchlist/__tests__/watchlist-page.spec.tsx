import { render, screen } from '@testing-library/react';

import { metadata } from '../page';
import WatchlistPage from '../page';

jest.mock('../WatchlistPageClient', () => ({
  __esModule: true,
  default: function WatchlistPageClientMock() {
    return <div data-testid="watchlist-page-client-mock" />;
  },
}));

describe('WatchlistPage (app route)', () => {
  it('exports metadata for the watchlist route', () => {
    expect(metadata.title).toBe('Watchlist | Stacks Explorer');
    expect(metadata.description).toBeDefined();
  });

  it('renders WatchlistPageClient', () => {
    render(<WatchlistPage />);
    expect(screen.getByTestId('watchlist-page-client-mock')).toBeInTheDocument();
  });
});
