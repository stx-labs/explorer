import { isSBTC, showSBTCTokenAlert } from '../utils';

const MAINNET_SBTC = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token';
const TESTNET_SBTC = 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1.sbtc-token';
const IMPOSTOR_SBTC = 'SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.sbtc-token';

describe('isSBTC', () => {
  it('matches the official sBTC contract on any network', () => {
    expect(isSBTC(MAINNET_SBTC)).toBe(true);
    expect(isSBTC(TESTNET_SBTC)).toBe(true);
    expect(isSBTC(IMPOSTOR_SBTC)).toBe(false);
    expect(isSBTC('')).toBe(false);
  });
});

describe('showSBTCTokenAlert', () => {
  it('does not warn about the official sBTC token of any network', () => {
    expect(showSBTCTokenAlert('sBTC', 'sBTC', MAINNET_SBTC)).toBe(false);
    expect(showSBTCTokenAlert('sBTC', 'sBTC', TESTNET_SBTC)).toBe(false);
  });

  it('warns about tokens impersonating sBTC', () => {
    expect(showSBTCTokenAlert('sBTC', 'SBTC', IMPOSTOR_SBTC)).toBe(true);
  });
});
