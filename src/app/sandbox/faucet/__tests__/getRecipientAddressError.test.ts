import { NetworkModes } from '../../../../common/types/network';
import { getFaucetCurlCommand, getRecipientAddressError } from '../PageClient';

const TESTNET_ADDRESS = 'ST221Z6TDTC5E0BYR2V624Q2ST6R0Q71T78WTAX6H';
const MAINNET_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

describe('getRecipientAddressError', () => {
  it('accepts an address belonging to the active network', () => {
    expect(getRecipientAddressError(TESTNET_ADDRESS, NetworkModes.Testnet)).toBeUndefined();
  });

  it('rejects an empty or malformed address', () => {
    expect(getRecipientAddressError('', NetworkModes.Testnet)).toBe('Enter a Stacks address.');
    expect(getRecipientAddressError('nonsense', NetworkModes.Testnet)).toBe(
      'This is not a valid Stacks address.'
    );
  });

  it('rejects a valid address from the other network', () => {
    expect(getRecipientAddressError(MAINNET_ADDRESS, NetworkModes.Testnet)).toBe(
      'This is not a testnet address.'
    );
  });
});

describe('getFaucetCurlCommand', () => {
  it('targets the active network api for each token', () => {
    expect(getFaucetCurlCommand('https://api.testnet.hiro.so', 'stx')).toBe(
      'curl -X POST "https://api.testnet.hiro.so/extended/v1/faucets/stx?address=<STX_ADDRESS>"'
    );
    expect(getFaucetCurlCommand('https://api.testnet.hiro.so', 'sbtc')).toContain(
      '/extended/v1/faucets/sbtc?address='
    );
  });
});
