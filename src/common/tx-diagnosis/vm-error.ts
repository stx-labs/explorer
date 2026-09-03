/**
 * Parser for the `vm_error` strings stacks-core attaches to failed transactions.
 *
 * Post-condition failures use exactly seven `format!` strings
 * (stackslib/src/chainstate/stacks/db/transactions.rs, `check_transaction_postconditions`).
 * Runtime panics print the Debug name of the `RuntimeError` variant (clarity/src/vm/errors.rs).
 * Anything else with `(err none)` as the result is an analysis error surfaced at runtime.
 */

export type FungibleConditionCode = 'SentEq' | 'SentGt' | 'SentGe' | 'SentLt' | 'SentLe';
export type NonFungibleConditionCode = 'Sent' | 'NotSent';

export type ParsedVmError =
  | {
      kind: 'pc_amount';
      assetKind: 'stx' | 'ft';
      asset: string;
      principal: string;
      expected: string;
      code: FungibleConditionCode;
      actual: string;
    }
  | {
      kind: 'pc_nft_condition';
      asset: string;
      principal: string;
      value: string;
      code: NonFungibleConditionCode;
      sent: string;
    }
  | { kind: 'pc_nft_value_unchecked'; asset: string; value: string; principal: string }
  | { kind: 'pc_nft_unchecked'; asset: string; principal: string }
  | { kind: 'pc_nft_no_checks'; asset: string; principal: string }
  | { kind: 'pc_ft_unchecked'; asset: string; principal: string }
  | { kind: 'runtime'; variant: RuntimeVariant; detail?: string }
  | { kind: 'analysis'; message: string }
  | { kind: 'unknown'; message: string };

export const RUNTIME_VARIANTS = [
  'Arithmetic',
  'ArithmeticOverflow',
  'ArithmeticUnderflow',
  'SupplyOverflow',
  'SupplyUnderflow',
  'DivisionByZero',
  'MaxStackDepthReached',
  'MaxContextDepthReached',
  'BadBlockHeight',
  'NoSuchToken',
  'NotImplemented',
  'NoCallerInContext',
  'NoSenderInContext',
  'UnknownBlockHeaderHash',
  'BadBlockHash',
  'UnwrapFailure',
  'DefunctPoxContract',
  'PoxAlreadyLocked',
  'BlockTimeNotAvailable',
  'BadTokenName',
] as const;

export type RuntimeVariant = (typeof RUNTIME_VARIANTS)[number];

// Numbered groups (the project's TS target predates named groups).
const PC_AMOUNT_STX =
  /^Post-condition check failure on STX owned by (\S+): (\d+) (Sent(?:Eq|Gt|Ge|Lt|Le)) (\d+)$/;
const PC_AMOUNT_FT =
  /^Post-condition check failure on fungible asset (\S+) owned by (\S+): (\d+) (Sent(?:Eq|Gt|Ge|Lt|Le)) (\d+)$/;
const PC_NFT_CONDITION =
  /^Post-condition check failure on non-fungible asset (\S+) owned by (\S+): (.+) (Sent|NotSent) (.+)$/;
const PC_NFT_VALUE_UNCHECKED =
  /^Post-condition check failure: Non-fungible asset (\S+) value (.+) was moved by (\S+) but not checked$/;
const PC_NFT_UNCHECKED =
  /^Post-condition check failure: Non-fungible asset (\S+) was moved by (\S+) but not checked$/;
const PC_NFT_NO_CHECKS =
  /^Post-condition check failure: No checks for non-fungible asset (\S+) moved by (\S+)$/;
const PC_FT_UNCHECKED =
  /^Post-condition check failure: Fungible asset (\S+) was moved by (\S+) but not checked$/;

const RUNTIME_RE = new RegExp(`^(${RUNTIME_VARIANTS.join('|')})(?:\\(([^\\n]*)\\))?(?:\\s|$)`);

export function parseVmError(vmError: string | null | undefined): ParsedVmError | null {
  if (!vmError) return null;
  const text = vmError.trim();

  let m: RegExpMatchArray | null;
  if ((m = text.match(PC_AMOUNT_STX))) {
    return {
      kind: 'pc_amount',
      assetKind: 'stx',
      asset: 'STX',
      principal: m[1],
      expected: m[2],
      code: m[3] as FungibleConditionCode,
      actual: m[4],
    };
  }
  if ((m = text.match(PC_AMOUNT_FT))) {
    return {
      kind: 'pc_amount',
      assetKind: 'ft',
      asset: m[1],
      principal: m[2],
      expected: m[3],
      code: m[4] as FungibleConditionCode,
      actual: m[5],
    };
  }
  if ((m = text.match(PC_NFT_CONDITION))) {
    return {
      kind: 'pc_nft_condition',
      asset: m[1],
      principal: m[2],
      value: m[3],
      code: m[4] as NonFungibleConditionCode,
      sent: m[5],
    };
  }
  if ((m = text.match(PC_NFT_VALUE_UNCHECKED))) {
    return { kind: 'pc_nft_value_unchecked', asset: m[1], value: m[2], principal: m[3] };
  }
  if ((m = text.match(PC_NFT_UNCHECKED))) {
    return { kind: 'pc_nft_unchecked', asset: m[1], principal: m[2] };
  }
  if ((m = text.match(PC_NFT_NO_CHECKS))) {
    return { kind: 'pc_nft_no_checks', asset: m[1], principal: m[2] };
  }
  if ((m = text.match(PC_FT_UNCHECKED))) {
    return { kind: 'pc_ft_unchecked', asset: m[1], principal: m[2] };
  }

  const rt = text.match(RUNTIME_RE);
  if (rt) {
    return { kind: 'runtime', variant: rt[1] as RuntimeVariant, detail: rt[2] || undefined };
  }

  if (text.startsWith('Post-condition check failure')) {
    return { kind: 'unknown', message: text };
  }
  return { kind: 'analysis', message: text };
}

/** Human operator for a stacks-core condition code, e.g. `SentLe` → `at most`. */
export function describeConditionCode(
  code: FungibleConditionCode | NonFungibleConditionCode
): string {
  switch (code) {
    case 'SentEq':
      return 'exactly';
    case 'SentGt':
      return 'more than';
    case 'SentGe':
      return 'at least';
    case 'SentLt':
      return 'less than';
    case 'SentLe':
      return 'at most';
    case 'Sent':
      return 'must send';
    case 'NotSent':
      return 'must not send';
  }
}

/** The API's `condition_code` for a stacks-core Debug code (to match a vm_error to a post-condition). */
export function apiConditionCodeFor(
  code: FungibleConditionCode | NonFungibleConditionCode
): string {
  switch (code) {
    case 'SentEq':
      return 'sent_equal_to';
    case 'SentGt':
      return 'sent_greater_than';
    case 'SentGe':
      return 'sent_greater_than_or_equal_to';
    case 'SentLt':
      return 'sent_less_than';
    case 'SentLe':
      return 'sent_less_than_or_equal_to';
    case 'Sent':
      return 'sent';
    case 'NotSent':
      return 'not_sent';
  }
}
