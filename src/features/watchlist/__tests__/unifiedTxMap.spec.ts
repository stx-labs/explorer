import type { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import {
  getTxUnixSeconds,
  transactionToUnified,
  unwrapAddressTransactionRow,
} from '../unifiedTxMap';

const WATCH = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const OTHER = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';

describe('unifiedTxMap', () => {
  describe('getTxUnixSeconds', () => {
    it('prefers block_time when set', () => {
      const tx = { block_time: 1_700_000_000 } as unknown as Transaction;
      expect(getTxUnixSeconds(tx)).toBe(1_700_000_000);
    });

    it('returns null when no time fields', () => {
      const tx = { tx_id: '0x1' } as unknown as Transaction;
      expect(getTxUnixSeconds(tx)).toBeNull();
    });
  });

  describe('unwrapAddressTransactionRow', () => {
    it('unwraps v2 row with tx + stx totals', () => {
      const row = {
        tx: {
          tx_id: '0xabc',
          tx_type: 'smart_contract' as const,
          sender_address: WATCH,
        },
        stx_sent: '5',
        stx_received: '0',
      };
      const { tx, v2Totals } = unwrapAddressTransactionRow(row as never);
      expect(tx.tx_id).toBe('0xabc');
      expect(v2Totals).toEqual({ stx_sent: '5', stx_received: '0' });
    });
  });

  describe('transactionToUnified', () => {
    it('maps token_transfer to type transfer with amount from payload', () => {
      const tx: Transaction = {
        tx_id: '0x1',
        tx_type: 'token_transfer',
        sender_address: WATCH,
        token_transfer: {
          recipient_address: OTHER,
          amount: '12345',
          memo: '',
        },
      } as Transaction;
      const u = transactionToUnified(tx, WATCH);
      expect(u.type).toBe('transfer');
      expect(u.direction).toBe('out');
      expect(u.amount).toBe('12345');
      expect(u.timestamp).toBeGreaterThanOrEqual(0);
    });

    it('infers incoming direction when sender is not watched principal', () => {
      const tx: Transaction = {
        tx_id: '0x2',
        tx_type: 'token_transfer',
        sender_address: OTHER,
        token_transfer: {
          recipient_address: WATCH,
          amount: '99',
          memo: '',
        },
      } as Transaction;
      const u = transactionToUnified(tx, WATCH);
      expect(u.direction).toBe('in');
    });

    it('maps contract_call to contract_call type', () => {
      const tx = {
        tx_id: '0x3',
        tx_type: 'contract_call',
        sender_address: WATCH,
        contract_call: {
          contract_id: `${WATCH}.counter`,
          function_name: 'increment',
        },
      } as unknown as Transaction;
      const u = transactionToUnified(tx, WATCH);
      expect(u.type).toBe('contract_call');
    });

    it('uses v2 totals for non-token_transfer bucket amount', () => {
      const tx = {
        tx_id: '0x4',
        tx_type: 'smart_contract',
        sender_address: WATCH,
      } as unknown as MempoolTransaction;
      const u = transactionToUnified(tx, WATCH, { stx_sent: '10', stx_received: '0' });
      expect(u.type).toBe('token_transfer');
      expect(u.amount).toBe('10');
    });
  });
});
