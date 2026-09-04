/** Native and registry error-code resolution across called contracts and reachable callees. */
import {
  findFunctionBody,
  nativeAssetCallSites,
  propagatingNativeCallSites,
} from '../clarity-source';
import { diagnoseSync, enrich } from '../diagnose';
import { checkDiagnosis } from '../eval/rubric';
import { lookupRegistry } from '../registry';
import type { FailedContractCallTx } from '../types';

const DEPLOYER = 'SP000000000000000000002Q6VF78';
const CONTRACT = `${DEPLOYER}.sample`;
const TOKEN = `${DEPLOYER}.token`;

function tx(fn: string, result = '(err u1)', contractId = CONTRACT): FailedContractCallTx {
  return {
    tx_id: '0xabc',
    tx_status: 'abort_by_response',
    tx_type: 'contract_call',
    sender_address: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF',
    block_height: 100,
    fee_rate: '1000',
    nonce: 1,
    sponsored: false,
    post_condition_mode: 'deny',
    post_conditions: [],
    tx_result: { hex: '0x', repr: result },
    vm_error: null,
    contract_call: {
      contract_id: contractId,
      function_name: fn,
      function_signature: '',
      function_args: [],
    },
  } as unknown as FailedContractCallTx;
}

const called = (source_code: string, contract_id = CONTRACT) => ({ contract_id, source_code });

const factText = (d: { whatHappened: { parts: (string | { label: string })[] }[] }) =>
  d.whatHappened
    .map(f => f.parts.map(p => (typeof p === 'string' ? p : p.label)).join(''))
    .join('\n');

describe('several built-ins share the code', () => {
  const MINT = `
(define-non-fungible-token event uint)
(define-data-var last-id uint u0)
(define-public (mint (recipient principal))
  (let ((id (+ (var-get last-id) u1)))
    (try! (stx-transfer-memo? u1000 tx-sender 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF 0x00))
    (try! (nft-mint? event id recipient))
    (var-set last-id id)
    (ok id)))
`;

  it('lists each built-in as a candidate instead of giving up', () => {
    const t = tx('mint');
    const d = diagnoseSync(t, called(MINT));
    expect(d.errorCode?.nativeCandidates?.map(c => c.fn)).toEqual([
      'stx-transfer-memo?',
      'nft-mint?',
    ]);
    expect(d.errorCode?.nativeFunction).toBe('stx-transfer-memo?');
    expect(d.errorCode?.nativeTentative).toBe(true);
    expect(d.confidence).toBe('low');
    expect(d.headline).toMatch(
      /possibly because not enough STX balance or because an NFT with this id already exists/
    );
    // The candidates point at different causes, so no single tag is claimed.
    expect(d.evidence.find(e => e.id === 'tag')).toBeUndefined();
    expect(d.evidence.find(e => e.id === 'native')?.value).toBe('2 candidate built-ins');
    expect(factText(d)).toMatch(/Each of these steps can produce this code/);
    expect(checkDiagnosis(t, d).failed).toEqual([]);
  });

  it('does not count a built-in whose error unwrap! replaces with a constant', () => {
    const SRC = `
(define-constant ERR-FEE (err u100))
(define-non-fungible-token event uint)
(define-public (mint (recipient principal))
  (begin
    (unwrap! (stx-transfer? u1000 tx-sender 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF) ERR-FEE)
    (try! (nft-mint? event u1 recipient))
    (ok true)))
`;
    const d = diagnoseSync(tx('mint'), called(SRC));
    expect(d.errorCode?.nativeCandidates).toBeUndefined();
    expect(d.errorCode?.nativeFunction).toBe('nft-mint?');
    expect(d.errorCode?.nativeTentative).toBe(false);
    expect(d.headline).toBe('This call failed because an NFT with this id already exists.');
    expect(d.senderAction).toBe('Use a different id.');
  });

  it('classifies the form enclosing each built-in call', () => {
    const body = findFunctionBody(
      `
(define-public (f)
  (begin
    (try! (stx-transfer? u1 tx-sender tx-sender))
    (unwrap-panic (ft-mint? tok u1 tx-sender))
    (match (nft-burn? item u1 tx-sender) ok true err false)
    (ft-transfer? tok u1 tx-sender tx-sender)))
`,
      'f'
    )!;
    expect(nativeAssetCallSites(body).map(s => [s.fn, s.wrapper])).toEqual([
      ['stx-transfer?', 'try!'],
      ['ft-mint?', 'unwrap-panic'],
      ['nft-burn?', 'match'],
      ['ft-transfer?', 'bare'],
    ]);
    expect(propagatingNativeCallSites(body).map(s => s.fn)).toEqual([
      'stx-transfer?',
      'ft-transfer?',
    ]);
  });
});

describe('built-ins inside callees', () => {
  const WRAPPER = `
(define-public (deposit (amount uint))
  (begin
    (try! (contract-call? .token transfer amount tx-sender (as-contract tx-sender) none))
    (ok true)))
`;
  const TOKEN_SRC = `
(define-fungible-token tok)
(define-constant ERR_NOT_OWNER (err u4))
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_OWNER)
    (try! (ft-transfer? tok amount sender recipient))
    (ok true)))
`;
  const loader = async (id: string) =>
    id === TOKEN ? { contract_id: id, source_code: TOKEN_SRC } : null;

  it('attributes the code to the built-in the callee function calls, hedged', async () => {
    const t = tx('deposit');
    expect(diagnoseSync(t, called(WRAPPER)).errorCode?.nativeFunction).toBeUndefined();
    const d = await enrich(t, called(WRAPPER), { contracts: loader });
    expect(d.errorCode?.nativeFunction).toBe('ft-transfer?');
    expect(d.errorCode?.nativeTentative).toBe(true);
    expect(d.errorCode?.nativeCandidates).toEqual([
      {
        fn: 'ft-transfer?',
        meaning: 'not enough token balance',
        contractId: TOKEN,
        functions: ['transfer'],
      },
    ]);
    expect(d.confidence).toBe('low');
    expect(d.headline).toMatch(/possibly because not enough token balance \(in token\)/);
    expect(factText(d)).toMatch(/inside token \(entered through transfer\)/);
    expect(d.evidence.find(e => e.id === 'tag')?.value).toBe('insufficient');
    expect(d.evidence.find(e => e.id === 'native')?.value).toBe(
      'ft-transfer? in token · one candidate'
    );
    expect(checkDiagnosis(t, d).failed).toEqual([]);
  });

  it('keeps a constant defined in the callee ahead of its built-ins', async () => {
    const SRC = `
(define-fungible-token tok)
(define-constant ERR_NOT_OWNER (err u1))
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_OWNER)
    (try! (ft-transfer? tok amount sender recipient))
    (ok true)))
`;
    const d = await enrich(tx('deposit'), called(WRAPPER), {
      contracts: async id => (id === TOKEN ? { contract_id: id, source_code: SRC } : null),
    });
    expect(d.errorCode?.name).toBe('ERR_NOT_OWNER');
    expect(d.errorCode?.definedIn).toBe(TOKEN);
    expect(d.errorCode?.nativeFunction).toBeUndefined();
  });

  it('follows calls to contracts whose names carry upper-case letters', async () => {
    // zvstBTC.mint ends with a bare ft-mint?, which returns (err u1) for a zero amount.
    const UPPER = `${DEPLOYER}.zvstBTC`;
    const CALLER = `
(define-public (deposit (amount uint))
  (begin
    (try! (contract-call? .zvstBTC mint amount tx-sender))
    (ok true)))
`;
    const MINT = `
(define-fungible-token zvstbtc)
(define-constant ERR-NOT-AUTHORIZED (err u850001))
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq contract-caller .sample) ERR-NOT-AUTHORIZED)
    (ft-mint? zvstbtc amount recipient)))
`;
    const d = await enrich(tx('deposit'), called(CALLER), {
      contracts: async id => (id === UPPER ? { contract_id: id, source_code: MINT } : null),
    });
    expect(d.errorCode?.candidatesTried).toEqual([UPPER]);
    expect(d.errorCode?.nativeCandidates).toEqual([
      {
        fn: 'ft-mint?',
        meaning: 'the mint amount was zero',
        contractId: UPPER,
        functions: ['mint'],
      },
    ]);
  });

  it("combines the caller's own built-in with the callee's", async () => {
    const BOTH = `
(define-public (deposit (amount uint))
  (begin
    (try! (contract-call? .token transfer amount tx-sender (as-contract tx-sender) none))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (ok true)))
`;
    const t = tx('deposit');
    const d = await enrich(t, called(BOTH), { contracts: loader });
    expect(d.errorCode?.nativeCandidates?.map(c => [c.fn, c.contractId])).toEqual([
      ['stx-transfer?', undefined],
      ['ft-transfer?', TOKEN],
    ]);
    expect(d.errorCode?.nativeTentative).toBe(true);
    // Both mean "not enough balance", so the shared tag survives.
    expect(d.evidence.find(e => e.id === 'tag')?.value).toBe('insufficient');
    expect(d.headline).toMatch(
      /possibly because not enough STX balance or because not enough token balance \(in token\)/
    );
    expect(checkDiagnosis(t, d).failed).toEqual([]);
  });
});

describe('codes defined further down the call chain come from the registry', () => {
  it("explains Zest's u90000 through the curated entry", () => {
    const id = 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1-8';
    expect(lookupRegistry(id, 'u90000')?.name).toBe('ERR_HEALTH_FACTOR_GT_1');
    const HELPER = `
(define-public (liquidation-call (amount uint))
  (begin
    (try! (contract-call? .pool-borrow-v2-4 liquidation-call amount))
    (ok true)))
`;
    const t = tx('liquidation-call', '(err u90000)', id);
    const d = diagnoseSync(t, called(HELPER, id));
    expect(d.errorCode?.name).toBe('ERR_HEALTH_FACTOR_GT_1');
    expect(d.headline).toMatch(/health factor/);
    expect(d.confidence).toBe('high');
    expect(checkDiagnosis(t, d).failed).toEqual([]);
  });
});
