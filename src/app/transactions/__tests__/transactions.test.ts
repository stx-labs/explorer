import { compressTransactions } from '@/common/utils/transaction-utils';
import { storybookTxTableData } from '@/stories/table-utils/tx-table-data';

describe('compressTransactions', () => {
  it('should compress a token transfer transaction', () => {
    const tokenTransferTx = storybookTxTableData.find(tx => tx.tx_type === 'token_transfer');
    const compressed = compressTransactions([tokenTransferTx!]);

    expect(compressed[0]).toEqual({
      tx_id: tokenTransferTx!.tx_id,
      tx_type: 'token_transfer',
      tx_status: tokenTransferTx!.tx_status,
      block_height: tokenTransferTx!.block_height,
      fee_rate: tokenTransferTx!.fee_rate,
      block_time: tokenTransferTx!.block_time,
      sender_address: tokenTransferTx!.sender_address,
      is_unanchored: tokenTransferTx!.is_unanchored,
      microblock_canonical: tokenTransferTx!.microblock_canonical,
      canonical: tokenTransferTx!.canonical,
      token_transfer: {
        amount: tokenTransferTx!.token_transfer!.amount,
        recipient_address: tokenTransferTx!.token_transfer!.recipient_address,
      },
    });
  });

  it('should compress a contract call transaction', () => {
    const contractCallTx = storybookTxTableData.find(tx => tx.tx_type === 'contract_call');
    const compressed = compressTransactions([contractCallTx!]);

    expect(compressed[0]).toEqual({
      tx_id: contractCallTx!.tx_id,
      tx_type: 'contract_call',
      tx_status: contractCallTx!.tx_status,
      block_height: contractCallTx!.block_height,
      fee_rate: contractCallTx!.fee_rate,
      block_time: contractCallTx!.block_time,
      sender_address: contractCallTx!.sender_address,
      is_unanchored: contractCallTx!.is_unanchored,
      microblock_canonical: contractCallTx!.microblock_canonical,
      canonical: contractCallTx!.canonical,
      contract_call: {
        contract_id: contractCallTx!.contract_call!.contract_id,
        function_name: contractCallTx!.contract_call!.function_name,
      },
    });
  });

  it('should compress a tenure change transaction', () => {
    const tenureChangeTx = storybookTxTableData.find(tx => tx.tx_type === 'tenure_change');
    const compressed = compressTransactions([tenureChangeTx!]);

    expect(compressed[0]).toEqual({
      tx_id: tenureChangeTx!.tx_id,
      tx_type: 'tenure_change',
      tx_status: tenureChangeTx!.tx_status,
      block_height: tenureChangeTx!.block_height,
      fee_rate: tenureChangeTx!.fee_rate,
      block_time: tenureChangeTx!.block_time,
      sender_address: tenureChangeTx!.sender_address,
      is_unanchored: tenureChangeTx!.is_unanchored,
      microblock_canonical: tenureChangeTx!.microblock_canonical,
      canonical: tenureChangeTx!.canonical,
      tenure_change_payload: {
        cause: tenureChangeTx!.tenure_change_payload!.cause,
      },
    });
  });

  it('should handle multiple transactions', () => {
    const transactions = storybookTxTableData.slice(0, 3); // Get first 3 transactions
    const compressed = compressTransactions(transactions);

    expect(compressed).toHaveLength(3);
    compressed.forEach((tx, index) => {
      expect(tx).toHaveProperty('tx_id', transactions[index].tx_id);
      expect(tx).toHaveProperty('tx_type', transactions[index].tx_type);
      expect(tx).toHaveProperty('tx_status', transactions[index].tx_status);
      expect(tx).toHaveProperty('block_height', transactions[index].block_height);
      expect(tx).toHaveProperty('fee_rate', transactions[index].fee_rate);
      expect(tx).toHaveProperty('block_time', transactions[index].block_time);
      expect(tx).toHaveProperty('sender_address', transactions[index].sender_address);
      expect(tx).toHaveProperty('is_unanchored', transactions[index].is_unanchored);
      expect(tx).toHaveProperty('microblock_canonical', transactions[index].microblock_canonical);
      expect(tx).toHaveProperty('canonical', transactions[index].canonical);
    });
  });

  it('should handle empty array', () => {
    const compressed = compressTransactions([]);
    expect(compressed).toEqual([]);
  });
});
