import { getRequiresWallet } from '../Wrapper';

describe('getRequiresWallet', () => {
  it('exempts only the faucet, which needs no wallet', () => {
    expect(getRequiresWallet('/sandbox/faucet')).toBe(false);
  });

  it('requires a wallet for the pages that sign transactions', () => {
    expect(getRequiresWallet('/sandbox/deploy')).toBe(true);
    expect(getRequiresWallet('/sandbox/transfer')).toBe(true);
    expect(getRequiresWallet('/sandbox/contract-call')).toBe(true);
  });

  it('fails closed for an unknown or missing pathname', () => {
    expect(getRequiresWallet('/sandbox/faucet-v2')).toBe(true);
    expect(getRequiresWallet(null)).toBe(true);
  });
});
