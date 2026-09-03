import {
  contractCallTargets,
  contractPrincipalsIn,
  findErrorConstant,
  findFunctionBody,
  hasTraitParams,
  nativeAssetCalls,
  reachableFunctions,
  sexprEnd,
  usageLines,
} from '../clarity-source';

const SOURCE = `;; A test contract
(define-constant ERR_MINIMUM_RECEIVED (err u2003))
;; Minimum and maximum number of steps as unsigned int
(define-constant MIN_STEPS u1)
(define-constant ERR-SIGNATURES-NOT-UNIQUE u8403)
(define-constant ERR_UNUSED u77)

(define-private (helper (x uint))
  (begin
    ;; a comment with (unbalanced parens
    (asserts! (> x u0) (err ERR-SIGNATURES-NOT-UNIQUE))
    (ok (- x u1))))

(define-public (swap (amount uint) (min-dy uint) (pool <pool-trait>))
  (let ((out (try! (contract-call? pool swap-x-for-y amount)))
        (other (contract-call? .router-helper quote amount))
        (s "a string with ) inside"))
    (asserts! (>= out min-dy) ERR_MINIMUM_RECEIVED)
    (fold helper (list u1 u2) (ok u0))
    (try! (stx-transfer? amount tx-sender 'SP000000000000000000002Q6VF78.pox-4))
    (ok out)))

(define-public (unrelated)
  (ok true))
`;

describe('findErrorConstant', () => {
  it('finds pattern A definitions', () => {
    expect(findErrorConstant(SOURCE, 'u2003')).toMatchObject({
      name: 'ERR_MINIMUM_RECEIVED',
      pattern: 'A',
      line: 2,
    });
  });
  it('finds pattern B only when the constant is used as (err NAME)', () => {
    expect(findErrorConstant(SOURCE, 'u8403')).toMatchObject({
      name: 'ERR-SIGNATURES-NOT-UNIQUE',
      pattern: 'B',
    });
    // MIN_STEPS u1 is a plain constant — must not "explain" (err u1)
    expect(findErrorConstant(SOURCE, 'u1')).toBeNull();
    // ERR_UNUSED is never used as an error
    expect(findErrorConstant(SOURCE, 'u77')).toBeNull();
  });
  it('captures comments above the definition', () => {
    expect(findErrorConstant(SOURCE, 'u2003')?.comments).toEqual(['A test contract']);
  });
});

describe('sexprEnd / findFunctionBody', () => {
  it('balances parens while ignoring comments and strings', () => {
    const body = findFunctionBody(SOURCE, 'swap');
    expect(body).not.toBeNull();
    expect(body!.text.startsWith('(define-public (swap')).toBe(true);
    expect(body!.text.trimEnd().endsWith('(ok out)))')).toBe(true);
    const helper = findFunctionBody(SOURCE, 'helper')!;
    expect(helper.text).toContain('(ok (- x u1))');
    expect(sexprEnd('(a "b)" ;; )\n c)', 0)).toBe('(a "b)" ;; )\n c)'.length);
  });
  it('reports kind and line', () => {
    expect(findFunctionBody(SOURCE, 'helper')).toMatchObject({ kind: 'private', line: 8 });
    expect(findFunctionBody(SOURCE, 'nope')).toBeNull();
  });
});

describe('reachableFunctions', () => {
  it('follows bare-symbol callbacks (fold) but not unrelated functions', () => {
    const names = reachableFunctions(SOURCE, 'swap').map(b => b.name);
    expect(names).toEqual(expect.arrayContaining(['swap', 'helper']));
    expect(names).not.toContain('unrelated');
  });
});

describe('callees and principals', () => {
  it('resolves static contract-call? targets against the deployer', () => {
    const body = findFunctionBody(SOURCE, 'swap')!;
    expect(contractCallTargets(body.text, 'SP1DEPLOYER')).toEqual(['SP1DEPLOYER.router-helper']);
  });
  it('extracts contract principals from argument reprs, including inside tuples/lists', () => {
    expect(
      contractPrincipalsIn([
        "(list (tuple (pool-trait 'SM1FKXGNZJWSTWDWXQZJNF7B5TV5ZB235JTCXYXKD.dlmm-pool-stx-sbtc-v-1-bps-15) (amount u1)))",
        'u5',
      ])
    ).toEqual(['SM1FKXGNZJWSTWDWXQZJNF7B5TV5ZB235JTCXYXKD.dlmm-pool-stx-sbtc-v-1-bps-15']);
  });
  it('detects trait parameters and native asset calls', () => {
    const body = findFunctionBody(SOURCE, 'swap')!;
    expect(hasTraitParams(body)).toBe(true);
    expect(hasTraitParams(findFunctionBody(SOURCE, 'unrelated')!)).toBe(false);
    expect(nativeAssetCalls(body)).toEqual(['stx-transfer?']);
  });
});

describe('usageLines', () => {
  it('finds asserts!/err usage sites of a constant inside a body', () => {
    const swap = findFunctionBody(SOURCE, 'swap')!;
    expect(usageLines(SOURCE, swap, 'ERR_MINIMUM_RECEIVED')).toEqual([18]);
    const helper = findFunctionBody(SOURCE, 'helper')!;
    expect(usageLines(SOURCE, helper, 'ERR-SIGNATURES-NOT-UNIQUE')).toEqual([11]);
  });
});
