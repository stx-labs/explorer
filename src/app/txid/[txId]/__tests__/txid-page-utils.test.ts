import { asInitialContractData } from '../txid-page-utils';

describe('asInitialContractData', () => {
  it('accepts a contract response with source code', () => {
    const contract = {
      contract_id: 'SP123.example',
      source_code: '(define-public (go) (ok true))',
    };

    expect(asInitialContractData(contract)).toBe(contract);
  });

  it.each([undefined, null, {}, { error: 'not found' }, { source_code: 123 }])(
    'rejects an API error or malformed payload: %p',
    payload => {
      expect(asInitialContractData(payload)).toBeUndefined();
    }
  );
});
