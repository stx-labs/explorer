import { TransactionSummary } from '@/common/types/tx-v3';

import {
  mapPrincipalTxRow,
  principalTxsColumns,
  principalTxsColumnsWithEvents,
} from '../principalTxsTableColumns';
import { TxTableColumns } from '../types';

const tx = {
  tx_id: '0x01',
  type: 'contract_call',
  sender: { address: 'SP1', nonce: 0 },
  contract_call: { contract_id: 'SP2.sbtc-token', function_name: 'transfer' },
  fee_rate: '0',
  block: { time: 0 },
  event_count: 3,
} as unknown as TransactionSummary;

describe('principalTxsTableColumns', () => {
  it('omits the Events column by default', () => {
    expect(principalTxsColumns.map(c => c.id)).not.toContain(TxTableColumns.Events);
  });

  it('appends the Events column for the token Transactions tab', () => {
    const ids = principalTxsColumnsWithEvents.map(c => c.id);
    expect(ids).toEqual([...principalTxsColumns.map(c => c.id), TxTableColumns.Events]);
  });

  it('maps the summary into the Events cell so event_count can be rendered', () => {
    expect(mapPrincipalTxRow(tx)[TxTableColumns.Events]).toBe(tx);
  });
});
