import { TransactionStatus } from '../../../common/constants/constants';
import { MempoolTransactionSummary, TransactionSummary } from '../../../common/types/tx-v3';
import {
  MEMPOOL_TX_TYPE_FILTER_VALUES,
  TX_TYPE_FILTER_VALUES,
  filterByType,
  getV3MempoolTxTitle,
  getV3ToAddress,
  getV3TxStatus,
  getV3TxTitle,
  parseTransactionTypeParam,
  toTypeParam,
} from '../utils';

const summary = (overrides: Record<string, unknown>): TransactionSummary =>
  ({ block: { height: 1000 }, ...overrides }) as unknown as TransactionSummary;

const mempoolSummary = (overrides: Record<string, unknown>): MempoolTransactionSummary =>
  ({ tx_id: '0xabc', status: 'pending', ...overrides }) as unknown as MempoolTransactionSummary;

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

describe('getV3MempoolTxTitle', () => {
  it('renders the function name for a contract call', () => {
    expect(
      getV3MempoolTxTitle(
        mempoolSummary({ type: 'contract_call', contract_call: { function_name: 'transfer' } })
      )
    ).toBe('transfer');
  });

  it('formats a token transfer amount', () => {
    expect(
      getV3MempoolTxTitle(
        mempoolSummary({ type: 'token_transfer', token_transfer: { amount: '1000000' } })
      )
    ).toBe('Send 1.00 STX');
  });

  it('uses a generic coinbase label (mempool summaries carry no block height)', () => {
    expect(getV3MempoolTxTitle(mempoolSummary({ type: 'coinbase' }))).toBe('Coinbase');
  });

  it('uses a generic tenure change label', () => {
    expect(getV3MempoolTxTitle(mempoolSummary({ type: 'tenure_change' }))).toBe('Tenure change');
  });
});

describe('getV3ToAddress', () => {
  it('returns the recipient for a token transfer', () => {
    expect(
      getV3ToAddress(summary({ type: 'token_transfer', token_transfer: { recipient: 'SP123' } }))
    ).toBe('SP123');
  });

  it('returns the recipient for a mempool token transfer summary', () => {
    expect(
      getV3ToAddress(
        mempoolSummary({ type: 'token_transfer', token_transfer: { recipient: 'SP456' } })
      )
    ).toBe('SP456');
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

describe('filterByType', () => {
  const txs = [
    { tx_id: '0x01', type: 'coinbase' },
    { tx_id: '0x02', type: 'token_transfer' },
    { tx_id: '0x03', type: 'contract_call' },
  ];

  it('keeps every tx when no type is selected', () => {
    expect(filterByType(txs, [])).toBe(txs);
  });

  it('keeps only txs of the selected types', () => {
    expect(filterByType(txs, ['coinbase', 'contract_call']).map(tx => tx.tx_id)).toEqual([
      '0x01',
      '0x03',
    ]);
  });

  it('reads the type through getType for wrapped items', () => {
    const items = txs.map(transaction => ({ transaction }));
    const filtered = filterByType(items, ['token_transfer'], item => item.transaction.type);
    expect(filtered.map(item => item.transaction.tx_id)).toEqual(['0x02']);
  });
});

describe('parseTransactionTypeParam', () => {
  it('parses a comma-separated list of known types', () => {
    expect(parseTransactionTypeParam('coinbase,token_transfer')).toEqual([
      'coinbase',
      'token_transfer',
    ]);
  });

  it('drops unknown and duplicate types', () => {
    expect(parseTransactionTypeParam('coinbase, bogus,coinbase')).toEqual(['coinbase']);
  });

  it('returns undefined when the param is absent or has no known type', () => {
    expect(parseTransactionTypeParam(null)).toBeUndefined();
    expect(parseTransactionTypeParam('')).toBeUndefined();
    expect(parseTransactionTypeParam('bogus')).toBeUndefined();
  });
});

describe('toTypeParam', () => {
  it('orders the selection canonically so it maps to one request and query key', () => {
    expect(toTypeParam(['token_transfer', 'coinbase'], TX_TYPE_FILTER_VALUES)).toEqual(
      toTypeParam(['coinbase', 'token_transfer'], TX_TYPE_FILTER_VALUES)
    );
  });

  it('keeps only the types the endpoint accepts', () => {
    expect(
      toTypeParam(['coinbase', 'contract_call', 'bogus'], MEMPOOL_TX_TYPE_FILTER_VALUES)
    ).toEqual(['contract_call']);
  });

  it('returns no types, i.e. no filter, for an empty selection', () => {
    expect(toTypeParam([], TX_TYPE_FILTER_VALUES)).toEqual([]);
  });
});
