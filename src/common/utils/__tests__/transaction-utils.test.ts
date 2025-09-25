import {
  compressMempoolTransaction,
  compressTransaction,
  getAmount,
  getToAddress,
} from '../transaction-utils';

const extraProperties = {
  nonce: 0,
  sponsored: false,
  post_condition_mode: 'allow',
  post_conditions: [],
  anchor_mode: 'any',
};

// Mock data for compression tests
const mockFullTransaction: any = {
  tx_id: '0x1234567890abcdef',
  tx_type: 'token_transfer',
  tx_status: 'success',
  block_height: 12345,
  fee_rate: '1000',
  block_time: 1640995200,
  sender_address: 'ST1SENDER123',
  is_unanchored: false,
  microblock_canonical: true,
  canonical: true,
  token_transfer: {
    recipient_address: 'ST1RECIPIENT456',
    amount: '5000000',
  },
  ...extraProperties,
};

const mockContractCallTransaction: any = {
  tx_id: '0xabcdef1234567890',
  tx_type: 'contract_call',
  tx_status: 'success',
  block_height: 54321,
  fee_rate: '2000',
  block_time: 1640995300,
  sender_address: 'ST1CALLER789',
  is_unanchored: true,
  microblock_canonical: false,
  canonical: true,
  contract_call: {
    contract_id: 'ST1CONTRACT.test-contract',
    function_name: 'transfer',
  },
  ...extraProperties,
};

const mockCoinbaseTransaction: any = {
  tx_id: '0xcoinbase123456',
  tx_type: 'coinbase',
  tx_status: 'success',
  block_height: 67890,
  fee_rate: '0',
  block_time: 1640995400,
  sender_address: 'ST1MINER123',
  is_unanchored: false,
  microblock_canonical: true,
  canonical: true,
  coinbase_payload: {
    alt_recipient: 'ST1ALTRECIPIENT',
  },
  ...extraProperties,
};

const mockSmartContractTransaction: any = {
  tx_id: '0xsmartcontract123',
  tx_type: 'smart_contract',
  tx_status: 'success',
  block_height: 22222,
  fee_rate: '3000',
  block_time: 1640995800,
  sender_address: 'ST1SMARTCONTRACT',
  is_unanchored: false,
  microblock_canonical: true,
  canonical: true,
  smart_contract: {
    contract_id: 'ST1SMARTCONTRACT.deployed-contract',
  },
  ...extraProperties,
};

const mockTenureChangeTransaction: any = {
  tx_id: '0xtenurechange123',
  tx_type: 'tenure_change',
  tx_status: 'success',
  block_height: 33333,
  fee_rate: '0',
  block_time: 1640995900,
  sender_address: 'ST1TENURECHANGE',
  is_unanchored: false,
  microblock_canonical: true,
  canonical: true,
  tenure_change_payload: {
    cause: 'block_found',
  },
  ...extraProperties,
};

const mockMempoolTransaction: any = {
  tx_id: '0xmempool123456',
  tx_type: 'token_transfer',
  tx_status: 'pending',
  fee_rate: '1500',
  sender_address: 'ST1MEMPOOL123',
  receipt_time: 1640995500,
  receipt_time_iso: '2022-01-01T10:05:00.000Z',
  token_transfer: {
    recipient_address: 'ST1MEMPOOLRECIPIENT',
    amount: '3000000',
  },
  ...extraProperties,
};

const mockMempoolContractCall: any = {
  tx_id: '0xmempoolcontract',
  tx_type: 'contract_call',
  tx_status: 'pending',
  fee_rate: '2500',
  sender_address: 'ST1MEMPOOLCALLER',
  receipt_time: 1640995600,
  receipt_time_iso: '2022-01-01T10:06:40.000Z',
  contract_call: {
    contract_id: 'ST1MEMPOOLCONTRACT.test',
    function_name: 'mint',
  },
  ...extraProperties,
};

describe('transaction-utils', () => {
  describe('getToAddress', () => {
    it('should return recipient address for token transfer transactions', () => {
      expect(getToAddress(mockFullTransaction)).toBe('ST1RECIPIENT456');
      expect(getToAddress(mockMempoolTransaction)).toBe('ST1MEMPOOLRECIPIENT');
    });

    it('should return contract ID for smart contract transactions', () => {
      expect(getToAddress(mockSmartContractTransaction)).toBe('ST1SMARTCONTRACT.deployed-contract');
    });

    it('should return contract ID for contract call transactions', () => {
      expect(getToAddress(mockContractCallTransaction)).toBe('ST1CONTRACT.test-contract');
      expect(getToAddress(mockMempoolContractCall)).toBe('ST1MEMPOOLCONTRACT.test');
    });

    it('should return empty string for coinbase transactions', () => {
      expect(getToAddress(mockCoinbaseTransaction)).toBe('');
    });

    it('should return empty string for tenure change transactions', () => {
      expect(getToAddress(mockTenureChangeTransaction)).toBe('');
    });
  });

  describe('getAmount', () => {
    it('should return amount for token transfer transactions', () => {
      expect(getAmount(mockFullTransaction)).toBe(5000000);
      expect(getAmount(mockMempoolTransaction)).toBe(3000000);
    });

    it('should return 0 for non-token transfer transactions', () => {
      expect(getAmount(mockSmartContractTransaction)).toBe(0);
      expect(getAmount(mockContractCallTransaction)).toBe(0);
      expect(getAmount(mockCoinbaseTransaction)).toBe(0);
      expect(getAmount(mockTenureChangeTransaction)).toBe(0);
      expect(getAmount(mockMempoolContractCall)).toBe(0);
    });
  });

  describe('compressTransaction', () => {
    it('should compress token transfer transaction with all required fields', () => {
      const compressed = compressTransaction(mockFullTransaction);

      expect(compressed).toEqual({
        tx_id: '0x1234567890abcdef',
        tx_type: 'token_transfer',
        tx_status: 'success',
        block_height: 12345,
        fee_rate: '1000',
        block_time: 1640995200,
        sender_address: 'ST1SENDER123',
        is_unanchored: false,
        microblock_canonical: true,
        canonical: true,
        token_transfer: {
          recipient_address: 'ST1RECIPIENT456',
          amount: '5000000',
        },
      });
    });

    it('should compress contract call transaction', () => {
      const compressed = compressTransaction(mockContractCallTransaction);

      expect(compressed).toEqual({
        tx_id: '0xabcdef1234567890',
        tx_type: 'contract_call',
        tx_status: 'success',
        block_height: 54321,
        fee_rate: '2000',
        block_time: 1640995300,
        sender_address: 'ST1CALLER789',
        is_unanchored: true,
        microblock_canonical: false,
        canonical: true,
        contract_call: {
          contract_id: 'ST1CONTRACT.test-contract',
          function_name: 'transfer',
        },
      });
    });

    it('should compress coinbase transaction', () => {
      const compressed = compressTransaction(mockCoinbaseTransaction);

      expect(compressed).toEqual({
        tx_id: '0xcoinbase123456',
        tx_type: 'coinbase',
        tx_status: 'success',
        block_height: 67890,
        fee_rate: '0',
        block_time: 1640995400,
        sender_address: 'ST1MINER123',
        is_unanchored: false,
        microblock_canonical: true,
        canonical: true,
        coinbase_payload: {
          alt_recipient: 'ST1ALTRECIPIENT',
        },
      });
    });

    it('should compress smart contract transaction', () => {
      const compressed = compressTransaction(mockSmartContractTransaction);

      expect(compressed.smart_contract).toEqual({
        contract_id: 'ST1SMARTCONTRACT.deployed-contract',
      });
    });

    it('should compress tenure change transaction', () => {
      const compressed = compressTransaction(mockTenureChangeTransaction);

      expect(compressed.tenure_change_payload).toEqual({
        cause: 'block_found',
      });
    });
  });

  describe('compressMempoolTransaction', () => {
    it('should compress mempool token transfer transaction with receipt times', () => {
      const compressed = compressMempoolTransaction(mockMempoolTransaction);

      expect(compressed).toEqual({
        tx_id: '0xmempool123456',
        tx_type: 'token_transfer',
        tx_status: 'pending',
        fee_rate: '1500',
        sender_address: 'ST1MEMPOOL123',
        receipt_time: 1640995500,
        receipt_time_iso: '2022-01-01T10:05:00.000Z',
        token_transfer: {
          recipient_address: 'ST1MEMPOOLRECIPIENT',
          amount: '3000000',
        },
      });
    });

    it('should compress mempool contract call transaction', () => {
      const compressed = compressMempoolTransaction(mockMempoolContractCall);

      expect(compressed).toEqual({
        tx_id: '0xmempoolcontract',
        tx_type: 'contract_call',
        tx_status: 'pending',
        fee_rate: '2500',
        sender_address: 'ST1MEMPOOLCALLER',
        receipt_time: 1640995600,
        receipt_time_iso: '2022-01-01T10:06:40.000Z',
        contract_call: {
          contract_id: 'ST1MEMPOOLCONTRACT.test',
          function_name: 'mint',
        },
      });
    });
  });
});
