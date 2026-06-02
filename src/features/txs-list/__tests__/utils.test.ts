import { TransactionStatus } from '../../../common/constants/constants';
import { TransactionSummary } from '../../../common/types/tx-v3';
import { getV3ToAddress, getV3TxStatus, getV3TxTitle } from '../utils';

const summary = (overrides: Record<string, unknown>): TransactionSummary =>
  ({ block: { height: 1000 }, ...overrides }) as unknown as TransactionSummary;

describe('getV3TxStatus', () => {
  it('maps success to the anchor-block status', () => {
    expect(getV3TxStatus('success')).toBe(TransactionStatus.SUCCESS_ANCHOR_BLOCK);
  });

  it('maps an abort status to failed', () => {
    expect(getV3TxStatus('abort_by_post_condition')).toBe(TransactionStatus.FAILED);
  });
});

describe('getV3TxTitle', () => {
  it('renders the function name for a contract call', () => {
    expect(
      getV3TxTitle(summary({ type: 'contract_call', contract_call: { function_name: 'transfer' } }))
    ).toBe('transfer');
  });

  it('labels the genesis transfer at block height 1', () => {
    expect(
      getV3TxTitle(
        summary({ type: 'token_transfer', block: { height: 1 }, token_transfer: { amount: '5' } })
      )
    ).toBe('Stacks 2.0 genesis transfer');
  });

  it('formats a token transfer amount', () => {
    expect(
      getV3TxTitle(
        summary({
          type: 'token_transfer',
          block: { height: 2 },
          token_transfer: { amount: '1000000' },
        })
      )
    ).toBe('Send 1.00 STX');
  });

  it('labels a coinbase with its block height (v3 feed is confirmed-only)', () => {
    expect(getV3TxTitle(summary({ type: 'coinbase' }))).toBe('Block #1000');
  });
});

describe('getV3ToAddress', () => {
  it('returns the recipient for a token transfer', () => {
    expect(
      getV3ToAddress(summary({ type: 'token_transfer', token_transfer: { recipient: 'SP123' } }))
    ).toBe('SP123');
  });

  it('returns the contract id for a contract call', () => {
    expect(
      getV3ToAddress(summary({ type: 'contract_call', contract_call: { contract_id: 'SP1.abc' } }))
    ).toBe('SP1.abc');
  });

  it('returns the contract id for a smart contract deploy', () => {
    expect(
      getV3ToAddress(
        summary({ type: 'smart_contract', smart_contract: { contract_id: 'SP1.abc' } })
      )
    ).toBe('SP1.abc');
  });

  it('returns empty for types without a target', () => {
    expect(getV3ToAddress(summary({ type: 'coinbase' }))).toBe('');
  });
});
