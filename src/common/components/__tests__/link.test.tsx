import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { ButtonLink } from '@/ui/ButtonLink';
import { Link } from '@/ui/Link';
import { NextLink } from '@/ui/NextLink';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import {
  AddressLink,
  BlockLink,
  ExplorerLink,
  MicroBlockLink,
  TokenLink,
  TxLink,
} from '../ExplorerLinks';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the global context
jest.mock('../../context/useGlobalContext', () => ({
  useGlobalContext: () => ({
    activeNetwork: {
      url: 'https://api.testnet.hiro.so',
      networkId: 1,
      chainId: 2147483648,
      bnsLookupUrl: 'https://api.testnet.hiro.so',
      name: 'testnet',
      mode: 'testnet',
    },
  }),
}));

// Mock buildUrl utility
jest.mock('../../utils/buildUrl', () => ({
  buildUrl: (href: string) => `https://explorer.hiro.so${href}`,
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

describe('Link Components', () => {
  describe('Link', () => {
    it('renders with correct href', () => {
      renderWithChakraProviders(<Link href="https://example.com">External Link</Link>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('External Link');
    });

    it('handles click events for external links', () => {
      renderWithChakraProviders(<Link href="https://example.com">External Link</Link>);

      const link = screen.getByRole('link');
      fireEvent.click(link);

      // External links should not trigger router navigation
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('NextLink', () => {
    it('renders with correct href', () => {
      renderWithChakraProviders(<NextLink href="/internal-page">Internal Link</NextLink>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/internal-page');
      expect(link).toHaveTextContent('Internal Link');
    });

    it('uses default href when none provided', () => {
      renderWithChakraProviders(<NextLink>Default Link</NextLink>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/');
    });
  });

  describe('ButtonLink', () => {
    describe('Link variant (default)', () => {
      it('renders external link with correct href', () => {
        renderWithChakraProviders(
          <ButtonLink href="https://example.com" buttonLinkSize="big">
            External Button Link
          </ButtonLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveTextContent('External Button Link');
      });

      it('renders internal link with NextLink for relative URLs', () => {
        renderWithChakraProviders(
          <ButtonLink href="/internal-page" buttonLinkSize="small">
            Internal Button Link
          </ButtonLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/internal-page');
        expect(link).toHaveTextContent('Internal Button Link');
      });

      it('renders with forward direction by default', () => {
        renderWithChakraProviders(
          <ButtonLink href="/test" buttonLinkSize="big">
            Forward Link
          </ButtonLink>
        );

        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        // Arrow should be after text for forward direction
      });

      it('renders with backward direction when specified', () => {
        renderWithChakraProviders(
          <ButtonLink href="/test" buttonLinkSize="big" buttonLinkDirection="backward">
            Backward Link
          </ButtonLink>
        );

        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        // Arrow should be before text for backward direction
      });
    });

    describe('Button variant', () => {
      it('renders as button with click handler', () => {
        const handleClick = jest.fn();

        renderWithChakraProviders(
          <ButtonLink buttonLinkType="button" buttonLinkSize="big" onClick={handleClick}>
            Button Link
          </ButtonLink>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Button Link');

        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('renders small button variant', () => {
        renderWithChakraProviders(
          <ButtonLink buttonLinkType="button" buttonLinkSize="small" onClick={() => {}}>
            Small Button
          </ButtonLink>
        );

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('ExplorerLinks', () => {
    describe('ExplorerLink', () => {
      it('renders with built URL and correct href', () => {
        renderWithChakraProviders(<ExplorerLink href="/test-path">Explorer Link</ExplorerLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://explorer.hiro.so/test-path');
        expect(link).toHaveTextContent('Explorer Link');
      });

      it('opens in new tab when specified', () => {
        renderWithChakraProviders(
          <ExplorerLink href="/test-path" openInNewTab>
            New Tab Link
          </ExplorerLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('target', '_blank');
      });

      it('does not have target attribute when openInNewTab is false', () => {
        renderWithChakraProviders(<ExplorerLink href="/test-path">Same Tab Link</ExplorerLink>);

        const link = screen.getByRole('link');
        expect(link).not.toHaveAttribute('target');
      });
    });

    describe('TxLink', () => {
      it('renders transaction link with correct href', () => {
        const txId = 'test-transaction-id';

        renderWithChakraProviders(<TxLink txId={txId}>Transaction Link</TxLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/txid/${encodeURIComponent(txId)}`
        );
        expect(link).toHaveTextContent('Transaction Link');
      });

      it('opens in new tab when specified', () => {
        renderWithChakraProviders(
          <TxLink txId="test-tx" openInNewTab>
            New Tab Tx Link
          </TxLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('target', '_blank');
      });

      it('encodes special characters in transaction ID', () => {
        const txIdWithSpecialChars = 'tx-id/with?special&chars';

        renderWithChakraProviders(<TxLink txId={txIdWithSpecialChars}>Encoded Tx Link</TxLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/txid/${encodeURIComponent(txIdWithSpecialChars)}`
        );
      });
    });

    describe('TokenLink', () => {
      it('renders token link with correct href', () => {
        const tokenId = 'test-token-id';

        renderWithChakraProviders(<TokenLink tokenId={tokenId}>Token Link</TokenLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/token/${encodeURIComponent(tokenId)}`
        );
        expect(link).toHaveTextContent('Token Link');
      });

      it('encodes special characters in token ID', () => {
        const tokenIdWithSpecialChars = 'token-id/with?special&chars';

        renderWithChakraProviders(
          <TokenLink tokenId={tokenIdWithSpecialChars}>Encoded Token Link</TokenLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/token/${encodeURIComponent(tokenIdWithSpecialChars)}`
        );
      });
    });

    describe('MicroBlockLink', () => {
      it('renders microblock link with correct href', () => {
        const hash = 'test-microblock-hash';

        renderWithChakraProviders(<MicroBlockLink hash={hash}>MicroBlock Link</MicroBlockLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/microblock/${encodeURIComponent(hash)}`
        );
        expect(link).toHaveTextContent('MicroBlock Link');
      });

      it('encodes special characters in hash', () => {
        const hashWithSpecialChars = 'hash/with?special&chars';

        renderWithChakraProviders(
          <MicroBlockLink hash={hashWithSpecialChars}>Encoded MicroBlock Link</MicroBlockLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/microblock/${encodeURIComponent(hashWithSpecialChars)}`
        );
      });
    });

    describe('BlockLink', () => {
      it('renders block link with correct href', () => {
        const hash = 'test-block-hash';

        renderWithChakraProviders(<BlockLink hash={hash}>Block Link</BlockLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/block/${encodeURIComponent(hash)}`
        );
        expect(link).toHaveTextContent('Block Link');
      });

      it('encodes special characters in hash', () => {
        const hashWithSpecialChars = 'hash/with?special&chars';

        renderWithChakraProviders(
          <BlockLink hash={hashWithSpecialChars}>Encoded Block Link</BlockLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/block/${encodeURIComponent(hashWithSpecialChars)}`
        );
      });
    });

    describe('AddressLink', () => {
      it('renders address link for regular principal', () => {
        const principal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

        renderWithChakraProviders(<AddressLink principal={principal}>Address Link</AddressLink>);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/address/${encodeURIComponent(principal)}`
        );
        expect(link).toHaveTextContent('Address Link');
      });

      it('renders transaction link for contract principal (contains dot)', () => {
        const contractPrincipal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.contract-name';

        renderWithChakraProviders(
          <AddressLink principal={contractPrincipal}>Contract Link</AddressLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/txid/${encodeURIComponent(contractPrincipal)}`
        );
        expect(link).toHaveTextContent('Contract Link');
      });

      it('encodes special characters in principal', () => {
        const principalWithSpecialChars = 'principal/with?special&chars';

        renderWithChakraProviders(
          <AddressLink principal={principalWithSpecialChars}>Encoded Address Link</AddressLink>
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
          'href',
          `https://explorer.hiro.so/address/${encodeURIComponent(principalWithSpecialChars)}`
        );
      });
    });
  });

  describe('Navigation functionality', () => {
    it('all link components should navigate to their respective hrefs when clicked', () => {
      const { rerender } = renderWithChakraProviders(
        <Link href="https://example.com">Test Link</Link>
      );

      // Test basic Link
      let link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');

      // Test NextLink
      rerender(<NextLink href="/test-page">Next Link</NextLink>);
      link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test-page');

      // Test ButtonLink
      rerender(
        <ButtonLink href="/button-link" buttonLinkSize="big">
          Button Link
        </ButtonLink>
      );
      link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/button-link');

      // Test ExplorerLink
      rerender(<ExplorerLink href="/explorer">Explorer Link</ExplorerLink>);
      link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://explorer.hiro.so/explorer');
    });

    it('button variant of ButtonLink should trigger onClick when clicked', () => {
      const handleClick = jest.fn();

      renderWithChakraProviders(
        <ButtonLink buttonLinkType="button" buttonLinkSize="big" onClick={handleClick}>
          Click Me
        </ButtonLink>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
