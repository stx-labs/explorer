import { ChainId } from '@stacks/network';

import { Network, NetworkModes } from '../../types/network';
import { buildUrl, getQueryParams } from '../buildUrl';

// buildUrl/getQueryParams only read mode, url and the subnet/custom flags, so the
// remaining Network fields just need to be present.
const buildNetwork = (
  network: Pick<Network, 'label' | 'url' | 'mode'> & Partial<Network>
): Network => ({
  btcBlockBaseUrl: '',
  btcTxBaseUrl: '',
  btcAddressBaseUrl: '',
  networkId: ChainId.Mainnet,
  ...network,
});

describe('getQueryParams', () => {
  it('should return chain param for mainnet', () => {
    const network = buildNetwork({
      label: 'Mainnet',
      url: 'https://api.hiro.so',
      mode: NetworkModes.Mainnet,
    });
    expect(getQueryParams(network)).toBe('?chain=mainnet');
  });

  it('should return chain param for testnet', () => {
    const network = buildNetwork({
      label: 'Testnet',
      url: 'https://api.testnet.hiro.so',
      mode: NetworkModes.Testnet,
    });
    expect(getQueryParams(network)).toBe('?chain=testnet');
  });

  it('should add subnet param for subnet networks', () => {
    const network = buildNetwork({
      label: 'Subnet',
      url: 'https://subnet.example.com',
      mode: NetworkModes.Mainnet,
      isSubnet: true,
    });
    expect(getQueryParams(network)).toBe('?chain=mainnet&subnet=https://subnet.example.com');
  });

  it('should add api param for custom networks', () => {
    const network = buildNetwork({
      label: 'Custom',
      url: 'https://custom-api.example.com',
      mode: NetworkModes.Mainnet,
      isCustomNetwork: true,
    });
    expect(getQueryParams(network)).toBe('?chain=mainnet&api=https://custom-api.example.com');
  });

  it('should add ssr=false for localhost networks', () => {
    const network = buildNetwork({
      label: 'Devnet',
      url: 'http://localhost:3999',
      mode: NetworkModes.Mainnet,
    });
    expect(getQueryParams(network)).toBe('?chain=mainnet&ssr=false');
  });
});

describe('buildUrl', () => {
  const mainnetNetwork = buildNetwork({
    label: 'Mainnet',
    url: 'https://api.hiro.so',
    mode: NetworkModes.Mainnet,
  });

  const testnetNetwork = buildNetwork({
    label: 'Testnet',
    url: 'https://api.testnet.hiro.so',
    mode: NetworkModes.Testnet,
  });

  describe('URLs without existing query params', () => {
    it('should append query params to simple path', () => {
      expect(buildUrl('/address/SP123', mainnetNetwork)).toBe('/address/SP123?chain=mainnet');
    });

    it('should append query params to root path', () => {
      expect(buildUrl('/', mainnetNetwork)).toBe('/?chain=mainnet');
    });

    it('should append query params to nested path', () => {
      expect(buildUrl('/txid/0x123/events', mainnetNetwork)).toBe(
        '/txid/0x123/events?chain=mainnet'
      );
    });

    it('should work with testnet', () => {
      expect(buildUrl('/block/123', testnetNetwork)).toBe('/block/123?chain=testnet');
    });
  });

  describe('URLs with existing query params', () => {
    it('should append with & when URL already has query params', () => {
      expect(buildUrl('/address/SP123?tab=tokens', mainnetNetwork)).toBe(
        '/address/SP123?tab=tokens&chain=mainnet'
      );
    });

    it('should handle multiple existing query params', () => {
      expect(buildUrl('/search?query=test&page=2', mainnetNetwork)).toBe(
        '/search?query=test&page=2&chain=mainnet'
      );
    });

    it('should work with testnet and existing params', () => {
      expect(buildUrl('/address/SP123?tab=collectibles', testnetNetwork)).toBe(
        '/address/SP123?tab=collectibles&chain=testnet'
      );
    });

    it('should handle query params with encoded values', () => {
      expect(buildUrl('/search?q=hello%20world', mainnetNetwork)).toBe(
        '/search?q=hello%20world&chain=mainnet'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty path', () => {
      expect(buildUrl('', mainnetNetwork)).toBe('?chain=mainnet');
    });

    it('should handle path with only query string', () => {
      expect(buildUrl('?existing=param', mainnetNetwork)).toBe('?existing=param&chain=mainnet');
    });

    it('should handle path with hash', () => {
      // Note: hash comes after query params in URLs
      expect(buildUrl('/page#section', mainnetNetwork)).toBe('/page#section?chain=mainnet');
    });

    it('should handle contract IDs with dots', () => {
      const contractPath = '/address/SP123.my-contract';
      expect(buildUrl(contractPath, mainnetNetwork)).toBe(
        '/address/SP123.my-contract?chain=mainnet'
      );
    });

    it('should handle encoded contract IDs', () => {
      const contractPath = '/address/SP123.my-contract?tab=tokens';
      expect(buildUrl(contractPath, mainnetNetwork)).toBe(
        '/address/SP123.my-contract?tab=tokens&chain=mainnet'
      );
    });
  });

  describe('with custom/subnet networks', () => {
    it('should properly append subnet params to URL with existing query', () => {
      const subnetNetwork = buildNetwork({
        label: 'Subnet',
        url: 'https://subnet.example.com',
        mode: NetworkModes.Mainnet,
        isSubnet: true,
      });
      expect(buildUrl('/address/SP123?tab=tokens', subnetNetwork)).toBe(
        '/address/SP123?tab=tokens&chain=mainnet&subnet=https://subnet.example.com'
      );
    });

    it('should properly append custom network params to URL with existing query', () => {
      const customNetwork = buildNetwork({
        label: 'Custom',
        url: 'https://custom.example.com',
        mode: NetworkModes.Testnet,
        isCustomNetwork: true,
      });
      expect(buildUrl('/txid/0x123?tab=events', customNetwork)).toBe(
        '/txid/0x123?tab=events&chain=testnet&api=https://custom.example.com'
      );
    });

    it('should properly append localhost params to URL with existing query', () => {
      const localhostNetwork = buildNetwork({
        label: 'Devnet',
        url: 'http://localhost:3999',
        mode: NetworkModes.Mainnet,
      });
      expect(buildUrl('/address/SP123?tab=tokens', localhostNetwork)).toBe(
        '/address/SP123?tab=tokens&chain=mainnet&ssr=false'
      );
    });
  });
});
