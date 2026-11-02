import { PrincipalTransactionSummary } from '@/common/types/tx-v3';

import {
  blockTxSummaryColumns,
  confirmedTxSummaryColumns,
  confirmedTxSummaryColumnsWithEvents,
  getTxDirection,
  mempoolTxSummaryColumns,
  toPrincipalTxSummaryRow,
} from '../txSummaryColumns';
import { TxTableColumns } from '../types';

function principalItem({
  sent = '0',
  received = '0',
  net = '0',
  fee = '100',
  involvement = 'sender',
  sponsor = null,
}: {
  sent?: string;
  received?: string;
  net?: string;
  fee?: string;
  involvement?: 'sender' | 'sponsor' | 'affected';
  sponsor?: { address: string; nonce: number } | null;
}) {
  return {
    transaction: { tx_id: '0x01', type: 'token_transfer', fee_rate: fee, sponsor },
    involvement,
    balance_changes: { stx: { sent, received, net } },
  } as unknown as PrincipalTransactionSummary;
}

describe('getTxDirection', () => {
  it('is "in" when the principal received STX', () => {
    expect(
      getTxDirection(principalItem({ received: '5000', net: '5000', involvement: 'affected' }))
    ).toBe('in');
  });

  it('is "out" when the sender sent STX beyond the fee', () => {
    expect(getTxDirection(principalItem({ sent: '5100', net: '-5100' }))).toBe('out');
  });

  it('has no direction when the sender only paid the fee', () => {
    expect(getTxDirection(principalItem({ sent: '100', net: '-100' }))).toBeUndefined();
  });

  it('treats a sponsored sender as not paying the fee', () => {
    const sponsor = { address: 'SP2', nonce: 0 };
    expect(getTxDirection(principalItem({ sent: '100', net: '-100', sponsor }))).toBe('out');
  });

  it('has no direction when the sponsor only paid the fee', () => {
    expect(
      getTxDirection(principalItem({ sent: '100', net: '-100', involvement: 'sponsor' }))
    ).toBeUndefined();
  });

  it('carries the direction into the table row', () => {
    const item = principalItem({ received: '5000', net: '5000', involvement: 'affected' });
    expect(toPrincipalTxSummaryRow(item)).toEqual({ tx: item.transaction, direction: 'in' });
  });
});

describe('shared tx summary column sets', () => {
  const ids = (columns: { id?: string }[]) => columns.map(column => column.id);

  it('shows nonce and block height for confirmed transactions', () => {
    expect(ids(confirmedTxSummaryColumns)).toEqual([
      TxTableColumns.Transaction,
      TxTableColumns.TxType,
      TxTableColumns.TxId,
      TxTableColumns.From,
      TxTableColumns.ArrowRight,
      TxTableColumns.To,
      TxTableColumns.Nonce,
      TxTableColumns.BlockHeight,
      TxTableColumns.Fee,
      TxTableColumns.BlockTime,
    ]);
  });

  it('appends Events only for the token Transactions tab', () => {
    expect(ids(confirmedTxSummaryColumns)).not.toContain(TxTableColumns.Events);
    expect(ids(confirmedTxSummaryColumnsWithEvents)).toEqual([
      ...ids(confirmedTxSummaryColumns),
      TxTableColumns.Events,
    ]);
  });

  it('drops the block column on the block page', () => {
    expect(ids(blockTxSummaryColumns)).toEqual(
      ids(confirmedTxSummaryColumns).filter(id => id !== TxTableColumns.BlockHeight)
    );
  });

  it('shows nonce but no block for pending transactions', () => {
    expect(ids(mempoolTxSummaryColumns)).toContain(TxTableColumns.Nonce);
    expect(ids(mempoolTxSummaryColumns)).not.toContain(TxTableColumns.BlockHeight);
  });
});
