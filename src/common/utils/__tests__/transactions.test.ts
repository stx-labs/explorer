import { getTxTitle } from '../transactions';

describe('getTxTitle', () => {
  it('should return genesis transfer label for block height 1 token transfers', () => {
    const genesisTx: any = {
      tx_type: 'token_transfer',
      block_height: 1,
      token_transfer: { amount: '0', recipient_address: 'ST1TEST' },
    };
    expect(getTxTitle(genesisTx)).toBe('Stacks 2.0 genesis transfer');
  });

  it('should return normal label for non-genesis token transfers', () => {
    const normalTx: any = {
      tx_type: 'token_transfer',
      block_height: 500,
      token_transfer: { amount: '1000000', recipient_address: 'ST1TEST' },
    };
    expect(getTxTitle(normalTx)).toBe('Send 1.00 STX');
  });

  it('should return normal label for mempool token transfers', () => {
    const mempoolTx: any = {
      tx_type: 'token_transfer',
      token_transfer: { amount: '2000000', recipient_address: 'ST1TEST' },
    };
    expect(getTxTitle(mempoolTx)).toBe('Send 2.00 STX');
  });
});
