import { ApiError } from '@/api/ApiError';
import { TransactionStatus } from '@/common/constants/constants';
import { TxDetails, TxEvent } from '@/common/types/tx-v3';

import {
  canListTokensTransferred,
  formatTenureChangeCause,
  getPendingTxRefetchInterval,
  getTxAssetEventDetails,
  getTxBlockTime,
  getTxDetailsStatus,
  getTxDetailsTitle,
  getTxDetailsToAddress,
  isConfirmedTxDetails,
} from '../tx-details-utils';

const SENDER = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const RECIPIENT = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';

function confirmedTx(fields: Record<string, unknown>): TxDetails {
  return {
    tx_id: '0x01',
    sender: { address: SENDER, nonce: 1 },
    sponsor: null,
    fee_rate: '180',
    status: 'success',
    block: { height: 100, hash: '0xblock', index_hash: '0xindex', time: 1700000100, tx_index: 0 },
    bitcoin_block: { height: 800, hash: '0xbtc', time: 1700000000 },
    ...fields,
  } as unknown as TxDetails;
}

function mempoolTx(fields: Record<string, unknown>): TxDetails {
  return {
    tx_id: '0x02',
    sender: { address: SENDER, nonce: 2 },
    sponsor: null,
    fee_rate: '180',
    status: 'pending',
    receipt_time: 1700000000,
    ...fields,
  } as unknown as TxDetails;
}

describe('getTxDetailsStatus', () => {
  test.each([
    ['success', TransactionStatus.SUCCESS_ANCHOR_BLOCK],
    ['abort_by_response', TransactionStatus.FAILED],
    ['abort_by_post_condition', TransactionStatus.FAILED],
    ['problematic_skipped', TransactionStatus.FAILED],
  ])('maps mined status %s', (status, expected) => {
    expect(getTxDetailsStatus(confirmedTx({ type: 'coinbase', status }))).toBe(expected);
  });

  test.each([
    ['pending', TransactionStatus.PENDING],
    ['dropped_replace_by_fee', TransactionStatus.DROPPED],
    ['dropped_stale_garbage_collect', TransactionStatus.DROPPED],
  ])('maps mempool status %s', (status, expected) => {
    expect(getTxDetailsStatus(mempoolTx({ type: 'coinbase', status }))).toBe(expected);
  });

  test('treats an unrecognized status on a mined transaction as failed', () => {
    expect(
      getTxDetailsStatus(confirmedTx({ type: 'coinbase', status: 'some_future_status' }))
    ).toBe(TransactionStatus.FAILED);
  });

  test('treats an unrecognized status on a pending transaction as pending', () => {
    expect(getTxDetailsStatus(mempoolTx({ type: 'coinbase', status: 'some_future_status' }))).toBe(
      TransactionStatus.PENDING
    );
  });
});

test('isConfirmedTxDetails tells mined transactions from pending ones', () => {
  expect(isConfirmedTxDetails(confirmedTx({ type: 'coinbase' }))).toBe(true);
  expect(isConfirmedTxDetails(mempoolTx({ type: 'coinbase' }))).toBe(false);
});

test('getTxBlockTime falls back to the bitcoin block time when the block has none', () => {
  const tx = confirmedTx({ type: 'coinbase' });
  expect(getTxBlockTime(tx as never)).toBe(1700000100);
  const withoutTime = confirmedTx({
    type: 'coinbase',
    block: { height: 1, hash: '0x', index_hash: '0x', time: 0, tx_index: 0 },
  });
  expect(getTxBlockTime(withoutTime as never)).toBe(1700000000);
});

describe('getTxDetailsTitle', () => {
  test('token transfers show the STX amount, or the genesis label in block 1', () => {
    const transfer = { recipient: RECIPIENT, amount: '2500000', memo: null };
    expect(getTxDetailsTitle(mempoolTx({ type: 'token_transfer', token_transfer: transfer }))).toBe(
      'Send 2.50 STX'
    );
    expect(
      getTxDetailsTitle(
        confirmedTx({
          type: 'token_transfer',
          token_transfer: transfer,
          block: { height: 1, hash: '0x', index_hash: '0x', time: 1, tx_index: 0 },
        })
      )
    ).toBe('Stacks 2.0 genesis transfer');
  });

  test('contract calls and deploys use the function and contract names', () => {
    expect(
      getTxDetailsTitle(
        confirmedTx({
          type: 'contract_call',
          contract_call: { contract_id: `${SENDER}.pool`, function_name: 'delegate-stx' },
        })
      )
    ).toBe('delegate-stx');
    expect(
      getTxDetailsTitle(
        confirmedTx({ type: 'smart_contract', smart_contract: { contract_id: `${SENDER}.pool` } })
      )
    ).toBe('pool');
  });

  test('coinbase and tenure changes reference their block once mined', () => {
    expect(getTxDetailsTitle(confirmedTx({ type: 'coinbase' }))).toBe('Block #100');
    expect(getTxDetailsTitle(mempoolTx({ type: 'coinbase' }))).toBe('Coinbase');
    expect(
      getTxDetailsTitle(
        confirmedTx({ type: 'tenure_change', tenure_change: { cause: 'block_found' } })
      )
    ).toBe('Tenure block_found (#100)');
    expect(getTxDetailsTitle(mempoolTx({ type: 'tenure_change' }))).toBe('Tenure change');
  });
});

test('getTxDetailsToAddress returns the recipient or the contract', () => {
  expect(
    getTxDetailsToAddress(
      mempoolTx({
        type: 'token_transfer',
        token_transfer: { recipient: RECIPIENT, amount: '1', memo: null },
      })
    )
  ).toBe(RECIPIENT);
  expect(
    getTxDetailsToAddress(
      confirmedTx({
        type: 'contract_call',
        contract_call: { contract_id: `${SENDER}.pool`, function_name: 'f' },
      })
    )
  ).toBe(`${SENDER}.pool`);
  expect(
    getTxDetailsToAddress(
      mempoolTx({ type: 'smart_contract', smart_contract: { contract_id: `${SENDER}.new-pool` } })
    )
  ).toBe(`${SENDER}.new-pool`);
  expect(getTxDetailsToAddress(confirmedTx({ type: 'coinbase' }))).toBe('');
});

describe('getTxAssetEventDetails', () => {
  const ASSET = `${SENDER}.token::token`;

  test('flattens transfers, mints and burns of each asset kind', () => {
    const events = [
      {
        event_index: 0,
        type: 'stx_asset',
        stx_asset: {
          type: 'transfer',
          sender: SENDER,
          recipient: RECIPIENT,
          amount: '5',
          memo: null,
        },
      },
      {
        event_index: 1,
        type: 'ft_asset',
        ft_asset: { type: 'mint', asset_identifier: ASSET, recipient: RECIPIENT, amount: '7' },
      },
      {
        event_index: 2,
        type: 'nft_asset',
        nft_asset: {
          type: 'burn',
          asset_identifier: ASSET,
          sender: SENDER,
          value: { hex: '0x01', repr: 'u1' },
        },
      },
    ] as unknown as TxEvent[];

    expect(events.map(getTxAssetEventDetails)).toEqual([
      {
        assetEventType: 'transfer',
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '5',
        assetIdentifier: undefined,
      },
      {
        assetEventType: 'mint',
        sender: undefined,
        recipient: RECIPIENT,
        amount: '7',
        assetIdentifier: ASSET,
      },
      {
        assetEventType: 'burn',
        sender: SENDER,
        recipient: undefined,
        amount: undefined,
        assetIdentifier: ASSET,
      },
    ]);
  });

  test('returns undefined for contract logs and STX locks', () => {
    const events = [
      {
        event_index: 0,
        type: 'contract_log',
        contract_log: {
          contract_id: `${SENDER}.pool`,
          topic: 'print',
          value: { hex: '0x', repr: 'u1' },
        },
      },
      {
        event_index: 1,
        type: 'stx_lock',
        stx_lock: { amount: '1', unlock_bitcoin_height: 1, address: SENDER },
      },
    ] as unknown as TxEvent[];

    expect(events.map(getTxAssetEventDetails)).toEqual([undefined, undefined]);
  });
});

test('formatTenureChangeCause replaces every underscore', () => {
  expect(formatTenureChangeCause('block_found')).toBe('Block found');
  expect(formatTenureChangeCause('extended_read_count')).toBe('Extended read count');
  expect(formatTenureChangeCause('extended')).toBe('Extended');
});

test('canListTokensTransferred only when one events request returns every event of a mined contract call', () => {
  const call = { contract_id: `${SENDER}.pool`, function_name: 'swap' };
  expect(
    canListTokensTransferred(
      confirmedTx({ type: 'contract_call', contract_call: call, event_count: 93 })
    )
  ).toBe(true);
  expect(
    canListTokensTransferred(
      confirmedTx({ type: 'contract_call', contract_call: call, event_count: 100 })
    )
  ).toBe(true);
  expect(
    canListTokensTransferred(
      confirmedTx({ type: 'contract_call', contract_call: call, event_count: 101 })
    )
  ).toBe(false);
  expect(
    canListTokensTransferred(
      confirmedTx({ type: 'contract_call', contract_call: call, event_count: 0 })
    )
  ).toBe(false);
  expect(canListTokensTransferred(mempoolTx({ type: 'contract_call', contract_call: call }))).toBe(
    false
  );
  expect(canListTokensTransferred(confirmedTx({ type: 'coinbase', event_count: 5 }))).toBe(false);
});

describe('getPendingTxRefetchInterval', () => {
  const apiError = (status: number) =>
    new ApiError({
      message: `Failed (${status})`,
      status,
      endpoint: '/extended/v3/transactions/{tx_id}',
      method: 'GET',
    });

  test('polls a pending transaction', () => {
    expect(getPendingTxRefetchInterval(mempoolTx({ type: 'coinbase' }), null, 5000)).toBe(5000);
  });

  test('stops once the transaction is mined', () => {
    expect(getPendingTxRefetchInterval(confirmedTx({ type: 'coinbase' }), null, 5000)).toBe(false);
  });

  test.each([404, 400])('stops after a terminal %i, such as a dropped transaction', status => {
    expect(
      getPendingTxRefetchInterval(mempoolTx({ type: 'coinbase' }), apiError(status), 5000)
    ).toBe(false);
  });

  test.each([
    ['a rate limit', apiError(429)],
    ['a timeout', apiError(408)],
    ['a server error', apiError(503)],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('keeps polling through %s', (_label, error) => {
    expect(getPendingTxRefetchInterval(mempoolTx({ type: 'coinbase' }), error, 5000)).toBe(5000);
  });

  test('does not poll dropped or missing transactions', () => {
    expect(
      getPendingTxRefetchInterval(
        mempoolTx({ type: 'coinbase', status: 'dropped_replace_by_fee' }),
        null,
        5000
      )
    ).toBe(false);
    expect(getPendingTxRefetchInterval(undefined, null, 5000)).toBe(false);
  });
});
