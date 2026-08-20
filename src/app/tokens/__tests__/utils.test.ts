import {
  getSbtcAssetId,
  getSbtcContractAddress,
  getSbtcNetworkMode,
  getVerifiedTokens,
} from '@/app/token/[tokenId]/consts';
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { Network, NetworkModes } from '@/common/types/network';

import { isSBTC, showSBTCTokenAlert } from '../utils';

const MAINNET_SBTC = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token';
const TESTNET_SBTC = 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1.sbtc-token';

describe('sBTC contract resolution', () => {
  it('resolves a different contract per network', () => {
    expect(getSbtcContractAddress(NetworkModes.Mainnet)).toBe(MAINNET_SBTC);
    expect(getSbtcContractAddress(NetworkModes.Testnet)).toBe(TESTNET_SBTC);
    expect(getSbtcAssetId(NetworkModes.Testnet)).toBe(`${TESTNET_SBTC}::sbtc-token`);
  });
});

describe('getSbtcNetworkMode', () => {
  const network = (overrides: Partial<Network>) =>
    ({ mode: NetworkModes.Testnet, url: DEFAULT_TESTNET_SERVER, ...overrides }) as Network;

  it('resolves the mode of a known public deployment', () => {
    expect(getSbtcNetworkMode(network({}))).toBe(NetworkModes.Testnet);
    expect(
      getSbtcNetworkMode(network({ mode: NetworkModes.Mainnet, url: DEFAULT_MAINNET_SERVER }))
    ).toBe(NetworkModes.Mainnet);
  });

  it('refuses to guess for devnet, custom nodes, or an unresolved network', () => {
    expect(getSbtcNetworkMode(network({ url: 'http://localhost:3999' }))).toBeUndefined();
    expect(getSbtcNetworkMode({} as Network)).toBeUndefined();
    expect(getSbtcNetworkMode(undefined)).toBeUndefined();
  });
});

describe('getVerifiedTokens', () => {
  it("includes the network's own sBTC and omits it when the network is unknown", () => {
    expect(getVerifiedTokens(NetworkModes.Testnet)).toContain(TESTNET_SBTC);
    expect(getVerifiedTokens(NetworkModes.Testnet)).not.toContain(MAINNET_SBTC);
    expect(getVerifiedTokens(undefined)).not.toContain(MAINNET_SBTC);
  });
});

describe('isSBTC', () => {
  it('only matches the sBTC contract of the given network', () => {
    expect(isSBTC(MAINNET_SBTC, NetworkModes.Mainnet)).toBe(true);
    expect(isSBTC(TESTNET_SBTC, NetworkModes.Testnet)).toBe(true);
    expect(isSBTC(MAINNET_SBTC, NetworkModes.Testnet)).toBe(false);
  });

  it('returns false for an empty contract id or an unknown network', () => {
    expect(isSBTC('', NetworkModes.Mainnet)).toBe(false);
    expect(isSBTC(MAINNET_SBTC, undefined)).toBe(false);
  });
});

describe('showSBTCTokenAlert', () => {
  it('does not warn on the official sBTC token of the active network', () => {
    expect(showSBTCTokenAlert('sBTC', 'sBTC', TESTNET_SBTC, NetworkModes.Testnet)).toBe(false);
    expect(showSBTCTokenAlert('sBTC', 'sBTC', MAINNET_SBTC, NetworkModes.Mainnet)).toBe(false);
  });

  it('warns on an sBTC look-alike', () => {
    expect(
      showSBTCTokenAlert(
        'sBTC',
        'sBTC',
        'ST2K48AP2251KJ45GEZNEEXG4EV8WQBYRPKT13BG9.sbtc-token',
        NetworkModes.Testnet
      )
    ).toBe(true);
  });

  it('warns on a network whose sBTC deployment is unknown', () => {
    expect(showSBTCTokenAlert('sBTC', 'sBTC', TESTNET_SBTC, undefined)).toBe(true);
  });

  it('does not warn on tokens that never reference sBTC', () => {
    expect(
      showSBTCTokenAlert(
        'Nothing',
        'NIL',
        'SP000000000000000000002Q6VF78.nothing',
        NetworkModes.Mainnet
      )
    ).toBe(false);
  });
});
