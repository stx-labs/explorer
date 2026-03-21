import { ChakraProvider, Table } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

import { system } from '../../../ui/theme/theme';
import { TokenRow } from '../TokenRow';

const tokenMetadata = {
  name: 'TestToken',
  tx_id: '0x1234',
  contract_principal: '0x5678',
  symbol: 'TT',
  total_supply: '1000000',
  image_uri: 'https://example.com/token.png',
  sender_address: '0x1234',
};

describe('TokenRow', () => {
  it('renders correctly', () => {
    const queryClient = new QueryClient();

    const { asFragment } = render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={system}>
          <Table.Root>
            <Table.Body>
              <TokenRow ftToken={tokenMetadata} />
            </Table.Body>
          </Table.Root>
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
