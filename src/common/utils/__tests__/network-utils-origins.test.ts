import {
  canServerFetch,
  configuredApiUrlFor,
  getApiUrl,
  isConfiguredApiUrl,
  normalizeApiOrigin,
} from '../network-utils';

describe('configured API origins', () => {
  it('normalises origins and rejects non-URLs', () => {
    expect(normalizeApiOrigin('https://api.hiro.so/')).toBe('https://api.hiro.so');
    expect(normalizeApiOrigin('https://api.hiro.so/v2/')).toBe('https://api.hiro.so/v2');
    expect(normalizeApiOrigin('not a url')).toBeNull();
    expect(normalizeApiOrigin(undefined)).toBeNull();
  });

  it('knows the public server for each chain', () => {
    expect(configuredApiUrlFor('mainnet')).toBe(getApiUrl('mainnet'));
    expect(configuredApiUrlFor('testnet')).toBe(getApiUrl('testnet'));
    expect(configuredApiUrlFor(undefined)).toBe(getApiUrl('mainnet'));
    expect(configuredApiUrlFor('devnet')).toBeNull();
  });

  it('recognises only the configured public servers', () => {
    expect(isConfiguredApiUrl(getApiUrl('mainnet'))).toBe(true);
    expect(isConfiguredApiUrl(`${getApiUrl('mainnet')}/`)).toBe(true);
    expect(isConfiguredApiUrl(getApiUrl('testnet'))).toBe(true);
    expect(isConfiguredApiUrl('https://evil.example')).toBe(false);
    expect(isConfiguredApiUrl('http://169.254.169.254/latest')).toBe(false);
    expect(isConfiguredApiUrl('https://api.hiro.so.evil.example')).toBe(false);
    expect(isConfiguredApiUrl('not a url')).toBe(false);
    expect(isConfiguredApiUrl(undefined)).toBe(false);
  });

  it('lets the server fetch only from those servers', () => {
    expect(canServerFetch(getApiUrl('mainnet'))).toBe(true);
    expect(canServerFetch(getApiUrl('mainnet', 'http://localhost:3999'))).toBe(false);
    expect(canServerFetch(getApiUrl('mainnet', 'https://my-node.example/api'))).toBe(false);
  });
});
