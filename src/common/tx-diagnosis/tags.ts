/**
 * Semantic tags inferred from an error constant's name. Order matters: the first match wins.
 * Names are matched upper-cased with `_`, `-` and spaces treated alike.
 */
export type SemanticTag =
  | 'slippage'
  | 'oracle'
  | 'expired'
  | 'taken'
  | 'already'
  | 'too_early'
  | 'insufficient'
  | 'health'
  | 'unauthorized'
  | 'paused'
  | 'dust'
  | 'signature'
  | 'not_found'
  | 'limit'
  | 'unknown';

const RULES: [SemanticTag, RegExp][] = [
  [
    'slippage',
    /MIN(IMUM)?[-_ ]?[XY]?[-_ ]?(RECEIVED|OUT|AMOUNT|DY|DX)|SLIPPAGE|PRICE[-_]IMPACT|EXCEEDS?[-_]MAX(IMUM)?[-_](IN|SPEND)|MAX[-_]IN\b/,
  ],
  ['oracle', /ORACLE|PRICE[-_]FEED|PYTH|STALE[-_]PRICE/],
  ['expired', /EXPIR|DEADLINE|TIMEOUT|TOO[-_]LATE|STALE/],
  // Something (a name, a slot, an id) is held by someone else — retrying the same inputs cannot work.
  [
    'taken',
    /NOT[-_]AVAILABLE|UNAVAILABLE|TAKEN|ALREADY[-_](REGISTERED|CLAIMED|MINTED|OWNED)|IN[-_]USE/,
  ],
  ['already', /ALREADY|DUPLICATE|EXISTS/],
  ['too_early', /INTERVAL|COOLDOWN|TOO[-_]EARLY|TOO[-_]SOON|NOT[-_]YET|LOCKED[-_]PERIOD/],
  ['insufficient', /INSUFFICIENT|NOT[-_]ENOUGH|BALANCE|NO[-_]FUNDS|UNDERFUNDED|INSOLVENT/],
  ['health', /UNHEALTHY|HEALTH[-_]FACTOR|LIQUIDAT|COLLATERAL/],
  [
    'unauthorized',
    /UNAUTHORI[SZ]ED|NOT[-_]AUTHORI[SZ]ED|NOT[-_]OWNER|OWNER[-_]ONLY|PERMISSION|FORBIDDEN|INVALID[-_]CALLER|NOT[-_]ADMIN|INVALID[-_]SENDER|NOT[-_]ALLOWED/,
  ],
  ['paused', /PAUSED|DISABLED|HALTED|SHUTDOWN|NOT[-_]ACTIVE|INACTIVE|DEPRECATED|NOT[-_]INIT/],
  ['dust', /DUST|TOO[-_]SMALL|BELOW[-_]MIN/],
  ['signature', /SIGNATURE|SIG[-_]|NOT[-_]UNIQUE|INVALID[-_]SIGNER/],
  [
    'not_found',
    /NOT[-_]FOUND|NO[-_]SUCH|UNKNOWN|DOES[-_]NOT[-_]EXIST|INVALID[-_](ID|REQUEST|POOL|PAIR|TOKEN|BOUNTY)|NO[-_]RESULT|\bNONE\b/,
  ],
  ['limit', /LIMIT|\bCAP\b|TOO[-_]MANY|EXCEED/],
];

export function tagForName(name: string | undefined | null): SemanticTag | undefined {
  if (!name) return undefined;
  const up = name.toUpperCase().replace(/[-\s]/g, '_');
  for (const [tag, re] of RULES) {
    if (re.test(up) || re.test(name.toUpperCase())) return tag;
  }
  return 'unknown';
}

/**
 * Tags whose failures are decided by on-chain state, not by timing or prices: repeating the same
 * call with the same inputs cannot succeed, so copy must never say "retry".
 */
export const DETERMINISTIC_TAGS: ReadonlySet<SemanticTag> = new Set<SemanticTag>([
  'taken',
  'already',
  'unauthorized',
  'dust',
  'limit',
]);
