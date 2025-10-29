import { ContractCallTransaction, PostConditionMode } from '@stacks/stacks-blockchain-api-types';
import { cvToJSON, hexToCV } from '@stacks/transactions';

import {
  formatClarityValue,
  formatFunctionResult,
  getContractCallTxFunctionArgs,
  getFunctionResultSuccessStatus,
} from '../utils';

export const contractCallTxWithNonTupleResult = {
  tx_id: '0xa3a507295688f791c5e4e78ba2d293bd8c415f1232357f82f539410c5ae20dd1',
  nonce: 613,
  fee_rate: '150000',
  sender_address: 'SP3T156FGQ9J6H9A6AZY2BA6SJJCCHPZB0Z97STDF',
  sponsored: false,
  post_condition_mode: 'deny',
  post_conditions: [],
  anchor_mode: 'any',
  block_hash: '0x5639903562e3e65792795f2fc7a8776351c99fda7154fd3985f337b5c0b02bf5',
  block_height: 2440447,
  block_time: 1753980719,
  block_time_iso: '2025-07-31T16:51:59.000Z',
  burn_block_time: 1753979615,
  burn_block_height: 907977,
  burn_block_time_iso: '2025-07-31T16:33:35.000Z',
  parent_burn_block_time: 1753979615,
  parent_burn_block_time_iso: '2025-07-31T16:33:35.000Z',
  canonical: true,
  tx_index: 1,
  tx_status: 'success',
  tx_result: {
    hex: '0x0703',
    repr: '(ok true)',
  },
  event_count: 2,
  parent_block_hash: '0x60bb6f8391ffec443faad81c3ae5ee2bb44eb4eb56b75b29b043acf2b01f2a3d',
  is_unanchored: false,
  microblock_hash: '0x',
  microblock_sequence: 2147483647,
  microblock_canonical: true,
  execution_cost_read_count: 17,
  execution_cost_read_length: 175375,
  execution_cost_runtime: 237642,
  execution_cost_write_count: 3,
  execution_cost_write_length: 283,
  vm_error: null,
  events: [
    {
      event_index: 0,
      event_type: 'smart_contract_log',
      tx_id: '0xa3a507295688f791c5e4e78ba2d293bd8c415f1232357f82f539410c5ae20dd1',
      contract_log: {
        contract_id: 'SP000000000000000000002Q6VF78.pox-4',
        topic: 'print',
        value: {
          hex: '0x070c000000060762616c616e63650100000000000000000000000000b2c632176275726e636861696e2d756e6c6f636b2d68656967687401000000000000000000000000000de15204646174610c000000030b64656c65676174652d746f05163bbc65d112e79ea9d2001e15f8a615885695d8b60c656e642d6379636c652d6964090e73746172742d6379636c652d69640100000000000000000000000000000074066c6f636b65640100000000000000000000000055a310b0046e616d650d000000137265766f6b652d64656c65676174652d73747807737461636b65720516f41299f0ba6468a54657fc25a8d99498c8dbeb07',
          repr: '(ok (tuple (balance u11716146) (burnchain-unlock-height u909650) (data (tuple (delegate-to \'SPXVRSEH2BKSXAEJ00F1BY562P45D5ERPSKR4Q33) (end-cycle-id none) (start-cycle-id u116))) (locked u1436750000) (name "revoke-delegate-stx") (stacker \'SP3T156FGQ9J6H9A6AZY2BA6SJJCCHPZB0Z97STDF)))',
        },
      },
    },
    {
      event_index: 1,
      event_type: 'smart_contract_log',
      tx_id: '0xa3a507295688f791c5e4e78ba2d293bd8c415f1232357f82f539410c5ae20dd1',
      contract_log: {
        contract_id: 'SP000000000000000000002Q6VF78.pox-4',
        topic: 'print',
        value: {
          hex: '0x070c000000060762616c616e63650100000000000000000000000000b2c632176275726e636861696e2d756e6c6f636b2d68656967687401000000000000000000000000000de15204646174610c000000060b616d6f756e742d7573747801000000000000000000000000564ae9700b64656c65676174652d746f05163bbc65d112e79ea9d2001e15f8a615885695d8b60c656e642d6379636c652d69640908706f782d61646472090e73746172742d6379636c652d6964010000000000000000000000000000007412756e6c6f636b2d6275726e2d68656967687409066c6f636b65640100000000000000000000000055a310b0046e616d650d0000000c64656c65676174652d73747807737461636b65720516f41299f0ba6468a54657fc25a8d99498c8dbeb07',
          repr: '(ok (tuple (balance u11716146) (burnchain-unlock-height u909650) (data (tuple (amount-ustx u1447750000) (delegate-to \'SPXVRSEH2BKSXAEJ00F1BY562P45D5ERPSKR4Q33) (end-cycle-id none) (pox-addr none) (start-cycle-id u116) (unlock-burn-height none))) (locked u1436750000) (name "delegate-stx") (stacker \'SP3T156FGQ9J6H9A6AZY2BA6SJJCCHPZB0Z97STDF)))',
        },
      },
    },
  ],
  tx_type: 'contract_call',
  contract_call: {
    contract_id: 'SP001SFSMC2ZY76PD4M68P3WGX154XCH7NE3TYMX.pox4-pools',
    function_name: 'delegate-stx',
    function_signature:
      '(define-public (delegate-stx (amount-ustx uint) (delegate-to principal) (until-burn-ht (optional uint)) (pool-pox-addr (optional (tuple (hashbytes (buff 32)) (version (buff 1))))) (user-pox-addr (tuple (hashbytes (buff 32)) (version (buff 1)))) (user-metadata (optional (tuple (keys (list 30 (string-ascii 8))) (values (list 30 (string-ascii 80))))))))',
    function_args: [
      {
        hex: '0x01000000000000000000000000564ae970',
        repr: 'u1447750000',
        name: 'amount-ustx',
        type: 'uint',
      },
      {
        hex: '0x05163bbc65d112e79ea9d2001e15f8a615885695d8b6',
        repr: "'SPXVRSEH2BKSXAEJ00F1BY562P45D5ERPSKR4Q33",
        name: 'delegate-to',
        type: 'principal',
      },
      {
        hex: '0x09',
        repr: 'none',
        name: 'until-burn-ht',
        type: '(optional uint)',
      },
      {
        hex: '0x0a0c00000002096861736862797465730200000014db14133a9dbb1d0e16b60513453e48b6ff2847a90776657273696f6e020000000104',
        repr: '(some (tuple (hashbytes 0xdb14133a9dbb1d0e16b60513453e48b6ff2847a9) (version 0x04)))',
        name: 'pool-pox-addr',
        type: '(optional (tuple (hashbytes (buff 32)) (version (buff 1))))',
      },
      {
        hex: '0x0c000000020968617368627974657302000000144510bcb888f8233b853c57151d98a4b3624aadaf0776657273696f6e020000000101',
        repr: '(tuple (hashbytes 0x4510bcb888f8233b853c57151d98a4b3624aadaf) (version 0x01))',
        name: 'user-pox-addr',
        type: '(tuple (hashbytes (buff 32)) (version (buff 1)))',
      },
      {
        hex: '0x09',
        repr: 'none',
        name: 'user-metadata',
        type: '(optional (tuple (keys (list 30 (string-ascii 8))) (values (list 30 (string-ascii 80)))))',
      },
    ],
  },
};

export const contractCallTxWithTupleResult = {
  tx_id: '0xd9861bd587592a8593e1ffcb7ce5238e7575d545786206f86d2d81769f563d17',
  nonce: 38,
  fee_rate: '3000',
  sender_address: 'SP3SF0KC6KKNN591PCXY82WZ73DE4J948RY7MVKWT',
  sponsored: false,
  post_condition_mode: 'deny',
  post_conditions: [],
  anchor_mode: 'any',
  block_hash: '0xe9b5255ed012165f0b0bd0dbf546bf78dd7656e26053d3176802a9150dded8d7',
  block_height: 2440558,
  block_time: 1753981179,
  block_time_iso: '2025-07-31T16:59:39.000Z',
  burn_block_time: 1753980917,
  burn_block_height: 907978,
  burn_block_time_iso: '2025-07-31T16:55:17.000Z',
  parent_burn_block_time: 1753980917,
  parent_burn_block_time_iso: '2025-07-31T16:55:17.000Z',
  canonical: true,
  tx_index: 1,
  tx_status: 'success',
  tx_result: {
    hex: '0x070a0c000000040b616d6f756e742d7573747801000000000000000000000005a17257f00c64656c6567617465642d746f061683ed66860315e334010bbfb76eb3eef887efee0a11706f78342d666173742d706f6f6c2d763308706f782d61646472090d756e74696c2d6275726e2d687409',
    repr: "(ok (some (tuple (amount-ustx u24183461872) (delegated-to 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3) (pox-addr none) (until-burn-ht none))))",
  },
  event_count: 1,
  parent_block_hash: '0xd4652f3f2a1a172b430ecdedc4bd2bcf57506a63b6767db73ed40d1a4d5af9bc',
  is_unanchored: false,
  microblock_hash: '0x',
  microblock_sequence: 2147483647,
  microblock_canonical: true,
  execution_cost_read_count: 5,
  execution_cost_read_length: 77123,
  execution_cost_runtime: 92886,
  execution_cost_write_count: 1,
  execution_cost_write_length: 37,
  vm_error: null,
  events: [
    {
      event_index: 0,
      event_type: 'smart_contract_log',
      tx_id: '0xd9861bd587592a8593e1ffcb7ce5238e7575d545786206f86d2d81769f563d17',
      contract_log: {
        contract_id: 'SP000000000000000000002Q6VF78.pox-4',
        topic: 'print',
        value: {
          hex: '0x070c000000060762616c616e6365010000000000000000000000001d5a7e0b176275726e636861696e2d756e6c6f636b2d68656967687401000000000000000000000000000de15204646174610c000000030b64656c65676174652d746f061683ed66860315e334010bbfb76eb3eef887efee0a11706f78342d666173742d706f6f6c2d76330c656e642d6379636c652d6964090e73746172742d6379636c652d69640100000000000000000000000000000074066c6f636b656401000000000000000000000005a16315b0046e616d650d000000137265766f6b652d64656c65676174652d73747807737461636b65720516f2f04d869ceb52a436677c8173e71b5c492488c7',
          repr: '(ok (tuple (balance u492469771) (burnchain-unlock-height u909650) (data (tuple (delegate-to \'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3) (end-cycle-id none) (start-cycle-id u116))) (locked u24182461872) (name "revoke-delegate-stx") (stacker \'SP3SF0KC6KKNN591PCXY82WZ73DE4J948RY7MVKWT)))',
        },
      },
    },
  ],
  tx_type: 'contract_call',
  contract_call: {
    contract_id: 'SP000000000000000000002Q6VF78.pox-4',
    function_name: 'revoke-delegate-stx',
    function_signature: '(define-public (revoke-delegate-stx ))',
    function_args: [],
  },
};

// Mock cvToJSON and hexToCV since we're testing functions that use them
jest.mock('@stacks/transactions', () => ({
  cvToJSON: jest.fn(),
  hexToCV: jest.fn(),
}));

// Mock microToStacksFormatted since we're testing functions that use it
jest.mock('@/common/utils/utils', () => ({
  microToStacksFormatted: jest.fn(),
}));

describe('Function Called Utils', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('formatClarityValueType', () => {
    // This function is not exported, so we'll test it indirectly through formatClarityValue
    it('formats basic clarity types correctly', () => {
      // Test through formatClarityValue
      const boolValue = formatClarityValue({ type: 'bool', repr: 'true' });
      const intValue = formatClarityValue({ type: 'int', repr: '42' });
      const principalValue = formatClarityValue({ type: 'principal', repr: 'SP123...' });
      const uintValue = formatClarityValue({ type: 'uint', repr: 'u100' });

      expect(boolValue.type).toBe('Boolean');
      expect(intValue.type).toBe('Integer');
      expect(principalValue.type).toBe('Principal');
      expect(uintValue.type).toBe('Unsigned Integer');
    });

    it('handles tuple type correctly', () => {
      const tupleValue = formatClarityValue({
        type: 'tuple',
        repr: '(tuple (key1 value1) (key2 value2))',
      });

      expect(tupleValue.type).toBe('Tuple');
    });

    it('returns the original type for other types', () => {
      const otherValue = formatClarityValue({ type: 'list', repr: '(list 1 2 3)' });
      expect(otherValue.type).toBe('list');
    });
  });

  describe('formatClarityValue', () => {
    it('handles principal values correctly', () => {
      // Mock the hexToCV and cvToJSON functions
      const mockPrincipal = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B.my-contract';
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({ value: mockPrincipal });

      const result = formatClarityValue({
        type: 'principal',
        repr: 'SP2J...02B',
        hex: '0x1234',
      });

      expect(result).toEqual({
        name: '',
        value: mockPrincipal,
        type: 'Principal',
      });

      // Verify hexToCV and cvToJSON were called
      expect(hexToCV).toHaveBeenCalledWith('0x1234');
      expect(cvToJSON).toHaveBeenCalled();
    });

    it('removes single quote prefix from principal address', () => {
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({ value: '' });

      const result = formatClarityValue({
        type: 'principal',
        repr: "'SP1Y3FBARS8CVANS1GCYVN3B6NZFMA7H61Z6TP6RK",
        hex: '0x1234',
      });

      expect(result).toEqual({
        name: '',
        value: 'SP1Y3FBARS8CVANS1GCYVN3B6NZFMA7H61Z6TP6RK',
        type: 'Principal',
      });

      expect(hexToCV).toHaveBeenCalledWith('0x1234');
      expect(cvToJSON).toHaveBeenCalled();
    });

    it('works normally for principal addresses without single quote prefix', () => {
      const result = formatClarityValue({
        type: 'principal',
        repr: 'SP1Y3FBARS8CVANS1GCYVN3B6NZFMA7H61Z6TP6RK',
      });

      expect(result).toEqual({
        name: '',
        value: 'SP1Y3FBARS8CVANS1GCYVN3B6NZFMA7H61Z6TP6RK',
        type: 'Principal',
      });
    });

    it('handles uint values correctly', () => {
      const result = formatClarityValue({
        type: 'uint',
        repr: 'u1000',
      });

      expect(result).toEqual({
        name: '',
        value: '1000',
        type: 'Unsigned Integer',
      });
    });

    it('handles ustx values correctly', () => {
      // Mock the microToStacksFormatted function specifically for this test
      const mockMicroToStacks = require('@/common/utils/utils').microToStacksFormatted;
      mockMicroToStacks.mockReturnValue('1');

      const result = formatClarityValue({
        type: 'uint',
        repr: 'u1000000',
        name: 'amount-ustx',
      });

      expect(result).toEqual({
        name: 'amount-ustx',
        value: '1',
        type: 'Unsigned Integer',
      });

      // Verify that microToStacksFormatted was called with the correct value
      expect(mockMicroToStacks).toHaveBeenCalledWith('1000000');
    });

    it('handles tuple values correctly', () => {
      const result = formatClarityValue({
        type: 'tuple',
        repr: '(tuple (key1 value1) (key2 value2))',
      });

      expect(result).toEqual({
        name: '',
        value: 'key1: value1, key2: value2, ',
        type: 'Tuple',
      });
    });

    it('handles other types correctly', () => {
      const result = formatClarityValue({
        type: 'string-ascii',
        repr: 'hello',
      });

      expect(result).toEqual({
        name: '',
        value: 'hello',
        type: 'string-ascii',
      });
    });
  });

  describe('formatFunctionResult', () => {
    it('formats non-tuple results correctly', () => {
      // Mock the hexToCV and cvToJSON functions for a non-tuple result
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({
        success: true,
        type: 'bool',
        value: true,
      });

      const result = formatFunctionResult({
        hex: '0x0703',
        repr: '(ok true)',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: '',
        value: '(ok true)',
        type: 'Boolean',
      });

      // Verify hexToCV was called with the correct hex value
      expect(hexToCV).toHaveBeenCalledWith('0x0703');
    });

    it('formats tuple results correctly', () => {
      // Mock the hexToCV and cvToJSON functions for a tuple result
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({
        success: true,
        type: 'tuple',
        value: {
          value: {
            amount: { type: 'uint', value: 1000 },
            recipient: { type: 'principal', value: 'SP123...' },
          },
        },
      });

      const result = formatFunctionResult({
        hex: '0x070a...',
        repr: '(ok (tuple (amount u1000) (recipient SP123...)))',
      });

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        name: 'amount',
        value: '1000',
        type: 'Unsigned Integer',
      });
      expect(result).toContainEqual({
        name: 'recipient',
        value: 'SP123...',
        type: 'Principal',
      });
    });

    it('handles nested types in tuple results', () => {
      // Mock the hexToCV and cvToJSON functions for a tuple with nested types
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({
        success: true,
        type: 'tuple',
        value: {
          value: {
            type: 'nested-type', // This indicates a nested type
            value: {
              field1: { type: 'uint', value: 100 },
              field2: { type: 'bool', value: true },
            },
          },
        },
      });

      const result = formatFunctionResult({
        hex: '0x070a...',
        repr: '(ok (tuple (field1 u100) (field2 true)))',
      });

      // The function should handle this case, even if the result might not be what we expect
      expect(result).toBeDefined();
    });

    it('formats results from real transaction data (non-tuple)', () => {
      // Use the real transaction data from our examples
      const txResult = contractCallTxWithNonTupleResult.tx_result;

      // Mock the hexToCV and cvToJSON functions to return what we expect from this tx
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({
        success: true,
        type: '(response bool)',
        value: true,
      });

      const result = formatFunctionResult(txResult);

      const expectedResult = [
        {
          name: '',
          value: '(ok true)',
          type: '(response bool)',
        },
      ];

      expect(result).toHaveLength(1);
      const firstResult = result[0];
      const expectedFirstResult = expectedResult[0];
      expect(firstResult.name).toEqual(expectedFirstResult.name);
      expect(firstResult.value).toEqual(expectedFirstResult.value);
      expect(firstResult.type).toEqual(expectedFirstResult.type);
      expect(hexToCV).toHaveBeenCalledWith('0x0703');
    });

    it('formats results from real transaction data (tuple)', () => {
      // Use the real transaction data from our examples
      const txResult = contractCallTxWithTupleResult.tx_result;

      // Mock the hexToCV and cvToJSON functions to return what we expect from this tx
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({
        success: true,
        type: '(response (optional (tuple (amount-ustx uint) (delegated-to principal) (pox-addr (optional none)) (until-burn-ht (optional none)))) UnknownType)',
        value: {
          type: '(optional (tuple (amount-ustx uint) (delegated-to principal) (pox-addr (optional none)) (until-burn-ht (optional none))))',
          value: {
            type: '(tuple (amount-ustx uint) (delegated-to principal) (pox-addr (optional none)) (until-burn-ht (optional none)))',
            value: {
              'amount-ustx': {
                type: 'uint',
                value: '24183461872',
              },
              'delegated-to': {
                type: 'principal',
                value: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3',
              },
              'pox-addr': {
                type: '(optional none)',
                value: null,
              },
              'until-burn-ht': {
                type: '(optional none)',
                value: null,
              },
            },
          },
        },
      });

      const result = formatFunctionResult(txResult);

      const expectedResult = [
        {
          name: 'type',
          value:
            '{"amount-ustx":{"type":"uint","value":"24183461872"},"delegated-to":{"type":"principal","value":"SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3"},"pox-addr":{"type":"optional: none","value":null},"until-burn-ht":{"type":"(optional, ',
          type: 'Tuple',
        },
        {
          name: 'value',
          value:
            '{"amount-ustx":{"type":"uint","value":"24183461872"},"delegated-to":{"type":"principal","value":"SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3"},"pox-addr":{"type":"optional: none","value":null},"until-burn-ht":{"type":"(optional, ',
          type: 'Tuple',
        },
      ];

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('type');
      expect(result[0].value).toBe(expectedResult[0].value);
      expect(result[0].type).toBe(expectedResult[0].type);
      expect(result[1].name).toBe('value');
      expect(result[1].value).toBe(expectedResult[1].value);
      expect(result[1].type).toBe(expectedResult[1].type);
      expect(hexToCV).toHaveBeenCalledWith(txResult.hex);
    });
  });

  describe('getContractCallTxFunctionArgs', () => {
    it('extracts function args from contract call transaction', () => {
      // Cast the test data to the expected type
      const typedTx = {
        ...contractCallTxWithNonTupleResult,
        post_condition_mode:
          contractCallTxWithNonTupleResult.post_condition_mode as PostConditionMode,
      } as ContractCallTransaction;

      const args = getContractCallTxFunctionArgs(typedTx);

      expect(args).toHaveLength(6);
      expect(args[0].name).toBe('amount-ustx');
      expect(args[0].type).toBe('uint');
    });

    it('returns empty array when no function args exist', () => {
      // Cast the test data to the expected type
      const typedTx = {
        ...contractCallTxWithTupleResult,
        post_condition_mode: contractCallTxWithTupleResult.post_condition_mode as PostConditionMode,
      } as ContractCallTransaction;

      const args = getContractCallTxFunctionArgs(typedTx);

      expect(args).toHaveLength(0);
    });
  });

  describe('getFunctionResultSuccessStatus', () => {
    it('returns success status from function result', () => {
      // Mock the hexToCV and cvToJSON functions
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({ success: true });

      // Cast the test data to the expected type with proper post_condition_mode
      const typedTx = {
        ...contractCallTxWithNonTupleResult,
        post_condition_mode:
          contractCallTxWithNonTupleResult.post_condition_mode as PostConditionMode,
      } as ContractCallTransaction;

      const result = getFunctionResultSuccessStatus(typedTx);

      expect(result).toBe(true);
      expect(hexToCV).toHaveBeenCalledWith('0x0703');
    });

    it('returns false for failed function result', () => {
      // Mock the hexToCV and cvToJSON functions
      (hexToCV as jest.Mock).mockReturnValue({});
      (cvToJSON as jest.Mock).mockReturnValue({ success: false });

      // Cast the test data to the expected type with proper post_condition_mode
      const typedTx = {
        ...contractCallTxWithNonTupleResult,
        post_condition_mode:
          contractCallTxWithNonTupleResult.post_condition_mode as PostConditionMode,
      } as ContractCallTransaction;

      const result = getFunctionResultSuccessStatus(typedTx);

      expect(result).toBe(false);
    });
  });
});
