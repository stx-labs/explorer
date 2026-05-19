import { DEFAULT_DEVNET_SERVER } from '../../constants/constants';
import { Network, NetworkModes } from '../../types/network';
import {
  getConnectNetworkString,
  isHiroSubdomain,
  isLocalhost,
  sanitizeNetworkUrlForTag,
} from '../network-utils';

describe('getApiUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_MAINNET_API_SERVER;
    delete process.env.NEXT_PUBLIC_TESTNET_API_SERVER;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default mainnet URL when env var is not set', () => {
    const { getApiUrl } = require('../network-utils');
    const { DEFAULT_MAINNET_SERVER } = require('@/common/constants/env');

    const result = getApiUrl('mainnet');
    expect(result).toBe('https://api.hiro.so');
    expect(DEFAULT_MAINNET_SERVER).toBe('https://api.hiro.so');
  });

  it('should use default testnet URL when env var is not set', () => {
    const { getApiUrl } = require('../network-utils');
    const { DEFAULT_TESTNET_SERVER } = require('@/common/constants/env');

    const result = getApiUrl('testnet');
    expect(result).toBe('https://api.testnet.hiro.so');
    expect(DEFAULT_TESTNET_SERVER).toBe('https://api.testnet.hiro.so');
  });

  it('should use env var value for mainnet when available', () => {
    process.env.NEXT_PUBLIC_MAINNET_API_SERVER = 'https://custom-mainnet-api.example.com';

    const { getApiUrl } = require('../network-utils');
    const { DEFAULT_MAINNET_SERVER } = require('@/common/constants/env');

    const result = getApiUrl('mainnet');
    expect(result).toBe('https://custom-mainnet-api.example.com');
    expect(DEFAULT_MAINNET_SERVER).toBe('https://custom-mainnet-api.example.com');
  });

  it('should use env var value for testnet when available', () => {
    process.env.NEXT_PUBLIC_TESTNET_API_SERVER = 'https://custom-testnet-api.example.com';

    const { getApiUrl } = require('../network-utils');
    const { DEFAULT_TESTNET_SERVER } = require('@/common/constants/env');

    const result = getApiUrl('testnet');
    expect(result).toBe('https://custom-testnet-api.example.com');
    expect(DEFAULT_TESTNET_SERVER).toBe('https://custom-testnet-api.example.com');
  });

  it('should prioritize customApiUrl over env values', () => {
    process.env.NEXT_PUBLIC_MAINNET_API_SERVER = 'https://env-mainnet.example.com';
    const customUrl = 'https://override-api.example.com';

    const { getApiUrl } = require('../network-utils');

    const result = getApiUrl('mainnet', customUrl);
    expect(result).toBe(customUrl);
  });
});

describe('isLocalhost', () => {
  describe('should return true for localhost URLs', () => {
    it('should detect http localhost with port', () => {
      expect(isLocalhost('http://localhost:3999')).toBe(true);
    });

    it('should detect https localhost with port', () => {
      expect(isLocalhost('https://localhost:8000')).toBe(true);
    });

    it('should detect localhost with different ports', () => {
      expect(isLocalhost('http://localhost:4000')).toBe(true);
    });

    it('should detect plain localhost', () => {
      expect(isLocalhost('http://localhost')).toBe(true);
    });
  });

  describe('should return false for non-localhost URLs', () => {
    it('should reject domains containing localhost as substring', () => {
      expect(isLocalhost('https://mylocalhost.com')).toBe(false);
    });

    it('should reject localhost subdomains', () => {
      expect(isLocalhost('https://api.localhost.dev')).toBe(false);
    });

    it('should reject hiro domains', () => {
      expect(isLocalhost('https://api.hiro.so')).toBe(false);
    });

    it('should reject other domains', () => {
      expect(isLocalhost('https://example.com')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isLocalhost('not-a-valid-url')).toBe(false);
    });

    it('should handle empty URLs', () => {
      expect(isLocalhost('')).toBe(false);
    });
  });
});

describe('isHiroSubdomain', () => {
  describe('should return true for Hiro domains', () => {
    it('should detect main hiro.so domain', () => {
      expect(isHiroSubdomain('https://api.hiro.so')).toBe(true);
    });

    it('should detect hiro subdomains', () => {
      expect(isHiroSubdomain('https://explorer.hiro.so')).toBe(true);
      expect(isHiroSubdomain('https://api.testnet.hiro.so')).toBe(true);
      expect(isHiroSubdomain('https://docs.hiro.so')).toBe(true);
    });

    it('should work with different protocols', () => {
      expect(isHiroSubdomain('http://api.hiro.so')).toBe(true);
      expect(isHiroSubdomain('https://api.hiro.so')).toBe(true);
    });

    it('should work with ports', () => {
      expect(isHiroSubdomain('https://api.hiro.so:443')).toBe(true);
    });
  });

  describe('should return false for non-Hiro domains', () => {
    it('should reject domains that contain hiro.so but are not subdomains', () => {
      expect(isHiroSubdomain('https://fakehiro.so.malicious.com')).toBe(false);
      expect(isHiroSubdomain('https://hiro.so.fake.com')).toBe(false);
    });

    it('should reject localhost', () => {
      expect(isHiroSubdomain('http://localhost:3999')).toBe(false);
    });

    it('should reject other domains', () => {
      expect(isHiroSubdomain('https://example.com')).toBe(false);
      expect(isHiroSubdomain('https://stacks.co')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isHiroSubdomain('not-a-valid-url')).toBe(false);
      expect(isHiroSubdomain('')).toBe(false);
      expect(isHiroSubdomain('just-text')).toBe(false);
    });

    it('should reject similar looking domains', () => {
      expect(isHiroSubdomain('https://hiro.som')).toBe(false);
      expect(isHiroSubdomain('https://hero.so')).toBe(false);
    });
  });
});

describe('getConnectNetworkString', () => {
  const baseNetwork: Network = {
    label: '',
    url: '',
    btcBlockBaseUrl: '',
    btcTxBaseUrl: '',
    btcAddressBaseUrl: '',
    networkId: 1,
    mode: NetworkModes.Mainnet,
  };

  it('should return "devnet" when the network URL matches DEFAULT_DEVNET_SERVER', () => {
    const network = { ...baseNetwork, url: DEFAULT_DEVNET_SERVER, mode: NetworkModes.Testnet };
    expect(getConnectNetworkString(network)).toBe('devnet');
  });

  it('should return network.mode for mainnet', () => {
    const network = { ...baseNetwork, url: 'https://api.hiro.so', mode: NetworkModes.Mainnet };
    expect(getConnectNetworkString(network)).toBe('mainnet');
  });

  it('should return network.mode for testnet', () => {
    const network = {
      ...baseNetwork,
      url: 'https://api.testnet.hiro.so',
      mode: NetworkModes.Testnet,
    };
    expect(getConnectNetworkString(network)).toBe('testnet');
  });
});

describe('sanitizeNetworkUrlForTag', () => {
  it('strips query string with auth tokens', () => {
    expect(sanitizeNetworkUrlForTag('https://api.hiro.so?token=secret')).toBe(
      'https://api.hiro.so'
    );
  });

  it('strips userinfo (basic auth)', () => {
    expect(sanitizeNetworkUrlForTag('https://user:pass@api.hiro.so/path')).toBe(
      'https://api.hiro.so/path'
    );
  });

  it('preserves protocol, host, and pathname', () => {
    expect(sanitizeNetworkUrlForTag('https://api.example.com:8080/v2')).toBe(
      'https://api.example.com:8080/v2'
    );
  });

  it('drops trailing slash for stable cardinality', () => {
    expect(sanitizeNetworkUrlForTag('https://api.hiro.so/')).toBe('https://api.hiro.so');
  });

  it('returns "unknown" for undefined', () => {
    expect(sanitizeNetworkUrlForTag(undefined)).toBe('unknown');
  });

  it('returns "invalid" for malformed input', () => {
    expect(sanitizeNetworkUrlForTag('not a url')).toBe('invalid');
  });
});
