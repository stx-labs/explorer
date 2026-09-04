/**
 * Error codes returned by Clarity's built-in asset functions
 * (clarity/src/vm/functions/assets.rs). These surface as `(err uN)` when a contract propagates the
 * built-in's result with `try!` / `unwrap!`, and no `define-constant` explains them.
 */
import type { SemanticTag } from './tags';

export interface NativeError {
  meaning: string;
  sender: string;
  tag: SemanticTag;
}

export const NATIVE_ERRORS: Record<string, Record<string, NativeError>> = {
  'stx-transfer?': {
    u1: {
      meaning: 'not enough STX balance',
      sender: 'Top up your STX balance and retry.',
      tag: 'insufficient',
    },
    u2: {
      meaning: 'sender and recipient are the same account',
      sender: 'Choose a different recipient.',
      tag: 'already',
    },
    u3: { meaning: 'the amount was zero', sender: 'Enter an amount above zero.', tag: 'dust' },
    u4: {
      meaning: 'the transfer was attempted from an account other than the transaction sender',
      sender: 'This is an app bug — report it to the app.',
      tag: 'unauthorized',
    },
  },
  'stx-transfer-memo?': {
    u1: {
      meaning: 'not enough STX balance',
      sender: 'Top up your STX balance and retry.',
      tag: 'insufficient',
    },
    u2: {
      meaning: 'sender and recipient are the same account',
      sender: 'Choose a different recipient.',
      tag: 'already',
    },
    u3: { meaning: 'the amount was zero', sender: 'Enter an amount above zero.', tag: 'dust' },
    u4: {
      meaning: 'the transfer was attempted from an account other than the transaction sender',
      sender: 'This is an app bug — report it to the app.',
      tag: 'unauthorized',
    },
  },
  'stx-burn?': {
    u1: {
      meaning: 'not enough STX balance',
      sender: 'Top up your STX balance and retry.',
      tag: 'insufficient',
    },
    u3: { meaning: 'the amount was zero', sender: 'Enter an amount above zero.', tag: 'dust' },
    u4: {
      meaning: 'the burn was attempted from an account other than the transaction sender',
      sender: 'This is an app bug — report it to the app.',
      tag: 'unauthorized',
    },
  },
  'ft-transfer?': {
    u1: {
      meaning: 'not enough token balance',
      sender: 'Top up the token balance and retry.',
      tag: 'insufficient',
    },
    u2: {
      meaning: 'sender and recipient are the same account',
      sender: 'Choose a different recipient.',
      tag: 'already',
    },
    u3: { meaning: 'the amount was zero', sender: 'Enter an amount above zero.', tag: 'dust' },
  },
  'ft-mint?': {
    u1: {
      meaning: 'the mint amount was zero',
      sender: 'Enter an amount above zero.',
      tag: 'dust',
    },
  },
  'ft-burn?': {
    u1: {
      meaning: 'not enough token balance, or the amount was zero',
      sender: 'Check the balance and amount, then retry.',
      tag: 'insufficient',
    },
  },
  'nft-transfer?': {
    u1: {
      meaning: 'the sender does not own this NFT',
      sender: 'Only the current owner can transfer it.',
      tag: 'unauthorized',
    },
    u2: {
      meaning: 'sender and recipient are the same account',
      sender: 'Choose a different recipient.',
      tag: 'already',
    },
    u3: { meaning: 'this NFT does not exist', sender: 'Check the asset id.', tag: 'not_found' },
  },
  'nft-mint?': {
    u1: {
      meaning: 'an NFT with this id already exists',
      sender: 'Use a different id.',
      tag: 'already',
    },
  },
  'nft-burn?': {
    u1: {
      meaning: 'the sender does not own this NFT',
      sender: 'Only the current owner can burn it.',
      tag: 'unauthorized',
    },
    u3: { meaning: 'this NFT does not exist', sender: 'Check the asset id.', tag: 'not_found' },
  },
};

export function nativeErrorFor(fn: string, code: string): NativeError | undefined {
  return NATIVE_ERRORS[fn]?.[code];
}
