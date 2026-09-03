import { apiConditionCodeFor, describeConditionCode, parseVmError } from '../vm-error';

describe('parseVmError', () => {
  it('parses a fungible "moved but not checked" failure', () => {
    const r = parseVmError(
      'Post-condition check failure: Fungible asset SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token was moved by SP3TP4PSXBGMSMYVAPVZ00ZN7PB79MAJ3X9SQP8H but not checked'
    );
    expect(r).toEqual({
      kind: 'pc_ft_unchecked',
      asset: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token',
      principal: 'SP3TP4PSXBGMSMYVAPVZ00ZN7PB79MAJ3X9SQP8H',
    });
  });

  it('parses a fungible amount condition failure', () => {
    const r = parseVmError(
      'Post-condition check failure on fungible asset SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token owned by SM1FKXGNZJWSTWDWXQZJNF7B5TV5ZB235JTCXYXKD.dlmm-pool-stx-sbtc-v-1-bps-15: 960464 SentGe 0'
    );
    expect(r).toMatchObject({
      kind: 'pc_amount',
      assetKind: 'ft',
      principal: 'SM1FKXGNZJWSTWDWXQZJNF7B5TV5ZB235JTCXYXKD.dlmm-pool-stx-sbtc-v-1-bps-15',
      expected: '960464',
      code: 'SentGe',
      actual: '0',
    });
  });

  it('parses an STX amount condition failure', () => {
    const r = parseVmError(
      'Post-condition check failure on STX owned by SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7: 1000000 SentLe 2000000'
    );
    expect(r).toMatchObject({ kind: 'pc_amount', assetKind: 'stx', asset: 'STX', code: 'SentLe' });
  });

  it('parses the three NFT formats', () => {
    expect(
      parseVmError(
        'Post-condition check failure on non-fungible asset SP1.nft::punk owned by SP2: UInt(7) Sent {}'
      )
    ).toMatchObject({ kind: 'pc_nft_condition', code: 'Sent' });
    expect(
      parseVmError(
        'Post-condition check failure: Non-fungible asset SP1.nft::punk value UInt(7) was moved by SP2 but not checked'
      )
    ).toMatchObject({ kind: 'pc_nft_value_unchecked', value: 'UInt(7)', principal: 'SP2' });
    expect(
      parseVmError(
        'Post-condition check failure: Non-fungible asset SP1.nft::punk was moved by SP2 but not checked'
      )
    ).toMatchObject({ kind: 'pc_nft_unchecked' });
    expect(
      parseVmError(
        'Post-condition check failure: No checks for non-fungible asset SP1.nft::punk moved by SP2'
      )
    ).toMatchObject({ kind: 'pc_nft_no_checks' });
  });

  it('parses runtime variants with and without detail', () => {
    expect(parseVmError('ArithmeticUnderflow')).toEqual({
      kind: 'runtime',
      variant: 'ArithmeticUnderflow',
      detail: undefined,
    });
    expect(parseVmError('SupplyOverflow(1000, 500)')).toEqual({
      kind: 'runtime',
      variant: 'SupplyOverflow',
      detail: '1000, 500',
    });
    expect(parseVmError('UnwrapFailure\n Stack Trace: \n_native_:native_unwrap')).toMatchObject({
      kind: 'runtime',
      variant: 'UnwrapFailure',
    });
  });

  it('treats other messages as analysis errors and nulls as null', () => {
    expect(parseVmError('NoSuchContract("SP1.missing")')).toEqual({
      kind: 'analysis',
      message: 'NoSuchContract("SP1.missing")',
    });
    expect(parseVmError(null)).toBeNull();
    expect(parseVmError('')).toBeNull();
  });

  it('maps condition codes', () => {
    expect(describeConditionCode('SentLe')).toBe('at most');
    expect(apiConditionCodeFor('SentGe')).toBe('sent_greater_than_or_equal_to');
    expect(apiConditionCodeFor('NotSent')).toBe('not_sent');
  });
});
