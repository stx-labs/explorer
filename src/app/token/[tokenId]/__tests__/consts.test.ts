import { NetworkModes } from '@/common/types/network';

import { getSbtcAssetId, getSbtcContractId, getSbtcNetworkMode, isSbtcAssetId } from '../consts';

const MAINNET_SBTC = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token';
const TESTNET_SBTC = 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1.sbtc-token';

describe('sBTC contract ids', () => {
  it('resolves the sBTC contract and asset id per network', () => {
    expect(getSbtcContractId(NetworkModes.Mainnet)).toBe(MAINNET_SBTC);
    expect(getSbtcContractId(NetworkModes.Testnet)).toBe(TESTNET_SBTC);
    expect(getSbtcAssetId(NetworkModes.Testnet)).toBe(`${TESTNET_SBTC}::sbtc-token`);
  });

  it('recognizes every network’s sBTC asset id', () => {
    expect(isSbtcAssetId(`${MAINNET_SBTC}::sbtc-token`)).toBe(true);
    expect(isSbtcAssetId(`${TESTNET_SBTC}::sbtc-token`)).toBe(true);
    expect(isSbtcAssetId('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.sbtc-token::sbtc-token')).toBe(
      false
    );
    expect(isSbtcAssetId(undefined)).toBe(false);
  });

  it('maps an sBTC contract id back to its network', () => {
    expect(getSbtcNetworkMode(MAINNET_SBTC)).toBe(NetworkModes.Mainnet);
    expect(getSbtcNetworkMode(TESTNET_SBTC)).toBe(NetworkModes.Testnet);
    expect(getSbtcNetworkMode('SP2EEV5QBZA454MSMW9W3WJNRXVJF36VPV17FFKYH.DROID')).toBeUndefined();
  });
});
