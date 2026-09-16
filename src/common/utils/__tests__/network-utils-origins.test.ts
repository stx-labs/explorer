import { canServerFetch, getApiUrl, isConfiguredApiUrl } from '../network-utils';

describe('configured API origins', () => {
  it('recognises only the configured public servers', () => {
    expect(isConfiguredApiUrl(getApiUrl('mainnet'))).toBe(true);
    expect(isConfiguredApiUrl(`${getApiUrl('mainnet')}/`)).toBe(true);
    expect(isConfiguredApiUrl(`${getApiUrl('mainnet')}/extended/v1/tx/0xabc`)).toBe(true);
    expect(isConfiguredApiUrl(getApiUrl('testnet'))).toBe(true);
    expect(isConfiguredApiUrl('https://evil.example')).toBe(false);
    expect(isConfiguredApiUrl('http://169.254.169.254/latest')).toBe(false);
    expect(isConfiguredApiUrl('https://api.hiro.so.evil.example')).toBe(false);
    expect(isConfiguredApiUrl('not a url')).toBe(false);
    expect(isConfiguredApiUrl(undefined)).toBe(false);
  });

  it('lets the server fetch only from those servers', () => {
    expect(canServerFetch(getApiUrl('mainnet'))).toBe(true);
    expect(canServerFetch(getApiUrl('testnet'))).toBe(true);
    expect(canServerFetch(getApiUrl('mainnet', 'http://localhost:3999'))).toBe(false);
    expect(canServerFetch(getApiUrl('mainnet', 'https://my-node.example/api'))).toBe(false);
  });
});
