import {
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  PostConditionType,
} from '@stacks/transactions';

import {
  PostConditionParameters,
  checkPostConditionParameters,
  extractPostConditionParams,
  fungibleConditionCodeToComparator,
  getPostCondition,
  getPostConditionConditionCodeOptions,
  isFungibleConditionCode,
  isNonFungibleConditionCode,
  isPostConditionParameter,
  nonFungibleConditionCodeToComparator,
} from '../function-call-post-condition-params-utils';

describe('Type Guard Functions', () => {
  describe('isFungibleConditionCode', () => {
    it('should return true for fungible condition codes', () => {
      expect(isFungibleConditionCode(FungibleConditionCode.Equal)).toBe(true);
      expect(isFungibleConditionCode(FungibleConditionCode.Greater)).toBe(true);
      expect(isFungibleConditionCode(FungibleConditionCode.GreaterEqual)).toBe(true);
      expect(isFungibleConditionCode(FungibleConditionCode.Less)).toBe(true);
      expect(isFungibleConditionCode(FungibleConditionCode.LessEqual)).toBe(true);
    });

    it('should return false for non-fungible condition codes', () => {
      expect(isFungibleConditionCode(NonFungibleConditionCode.DoesNotSend)).toBe(false);
      expect(isFungibleConditionCode(NonFungibleConditionCode.Sends)).toBe(false);
    });
  });

  describe('isNonFungibleConditionCode', () => {
    it('should return true for non-fungible condition codes', () => {
      expect(isNonFungibleConditionCode(NonFungibleConditionCode.DoesNotSend)).toBe(true);
      expect(isNonFungibleConditionCode(NonFungibleConditionCode.Sends)).toBe(true);
    });

    it('should return false for fungible condition codes', () => {
      expect(isNonFungibleConditionCode(FungibleConditionCode.Equal)).toBe(false);
      expect(isNonFungibleConditionCode(FungibleConditionCode.Greater)).toBe(false);
      expect(isNonFungibleConditionCode(FungibleConditionCode.GreaterEqual)).toBe(false);
      expect(isNonFungibleConditionCode(FungibleConditionCode.Less)).toBe(false);
      expect(isNonFungibleConditionCode(FungibleConditionCode.LessEqual)).toBe(false);
    });
  });
});

describe('Converter Functions', () => {
  describe('fungibleConditionCodeToComparator', () => {
    it('should convert fungible condition codes to comparators', () => {
      expect(fungibleConditionCodeToComparator(FungibleConditionCode.Equal)).toBe('eq');
      expect(fungibleConditionCodeToComparator(FungibleConditionCode.Greater)).toBe('gt');
      expect(fungibleConditionCodeToComparator(FungibleConditionCode.GreaterEqual)).toBe('gte');
      expect(fungibleConditionCodeToComparator(FungibleConditionCode.Less)).toBe('lt');
      expect(fungibleConditionCodeToComparator(FungibleConditionCode.LessEqual)).toBe('lte');
    });

    it('should return "eq" as default for unknown codes', () => {
      expect(fungibleConditionCodeToComparator('unknown' as unknown as FungibleConditionCode)).toBe(
        'eq'
      );
    });
  });

  describe('nonFungibleConditionCodeToComparator', () => {
    it('should convert non-fungible condition codes to comparators', () => {
      expect(nonFungibleConditionCodeToComparator(NonFungibleConditionCode.Sends)).toBe('sent');
      expect(nonFungibleConditionCodeToComparator(NonFungibleConditionCode.DoesNotSend)).toBe(
        'not-sent'
      );
    });

    it('should return "sent" as default for unknown codes', () => {
      expect(
        nonFungibleConditionCodeToComparator('unknown' as unknown as NonFungibleConditionCode)
      ).toBe('sent');
    });
  });
});

describe('Validation Functions', () => {
  describe('isPostConditionParameter', () => {
    it('should return true for valid post condition parameter keys', () => {
      expect(isPostConditionParameter('postConditionMode')).toBe(true);
      expect(isPostConditionParameter('postConditionType')).toBe(true);
      expect(isPostConditionParameter('postConditionAddress')).toBe(true);
      expect(isPostConditionParameter('postConditionConditionCode')).toBe(true);
      expect(isPostConditionParameter('postConditionAmount')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetAddress')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetContractName')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetName')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isPostConditionParameter('invalidKey')).toBe(false);
      expect(isPostConditionParameter('someOtherKey')).toBe(false);
      expect(isPostConditionParameter('')).toBe(false);
    });
  });

  describe('checkPostConditionParameters', () => {
    it('should return no errors for Allow mode', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Allow,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors).toEqual({});
    });

    it('should return error when post condition type is missing in Deny mode', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionType).toBe('Post condition type is required');
    });

    it('should return errors for missing STX post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Address is required');
      expect(errors.postConditionConditionCode).toBe('Condition Code is required');
      expect(errors.postConditionAmount).toBe('Amount is required');
    });

    it('should return errors for missing Fungible post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.Fungible,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Address is required');
      expect(errors.postConditionConditionCode).toBe('Condition Code is required');
      expect(errors.postConditionAmount).toBe('Amount is required');
      expect(errors.postConditionAssetAddress).toBe('Asset Address is required');
      expect(errors.postConditionAssetContractName).toBe('Asset Contract Name is required');
      expect(errors.postConditionAssetName).toBe('Asset Name is required');
    });

    it('should return errors for invalid addresses', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'invalid-address',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: 100,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Invalid Stacks address');
    });

    it('should return errors for invalid amounts', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: -100, // Invalid negative amount
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAmount).toBe('Invalid amount');
    });

    it('should validate valid STX post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: 100,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors).toEqual({});
    });
  });
});

describe('Post Condition Creation', () => {
  describe('getPostCondition', () => {
    it('should create STX post condition', () => {
      const params: PostConditionParameters = {
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: 100,
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'stx-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'eq',
        amount: '100',
      });
    });

    it('should create Fungible post condition', () => {
      const params: PostConditionParameters = {
        postConditionType: PostConditionType.Fungible,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Greater,
        postConditionAmount: 200,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-token',
        postConditionAssetName: 'token',
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'ft-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'gt',
        asset: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-token::token',
        amount: '200',
      });
    });

    it('should create Non-Fungible post condition', () => {
      const params: PostConditionParameters = {
        postConditionType: PostConditionType.NonFungible,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: NonFungibleConditionCode.Sends,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-nft',
        postConditionAssetName: 'nft-token',
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'nft-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'sent',
        asset: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-nft::nft-token',
        assetId: {
          type: 'utf8',
          value: 'nft-token',
        },
      });
    });

    it('should throw error for invalid STX post condition (missing parameters)', () => {
      const params: PostConditionParameters = {
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        // Missing condition code and amount
      };
      const result = getPostCondition(params);
      expect(result).toEqual(undefined);
    });

    it('should throw error for invalid amount (not uint128)', () => {
      const params: PostConditionParameters = {
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: -100, // Invalid uint128
      };
      const result = getPostCondition(params);
      expect(result).toEqual(undefined);
    });
  });
});

describe('Utility Functions', () => {
  describe('getPostConditionConditionCodeOptions', () => {
    it('should return non-fungible options for NonFungible post condition type', () => {
      const options = getPostConditionConditionCodeOptions(PostConditionType.NonFungible);
      expect(options).toHaveLength(2);
      expect(options).toEqual([
        { label: 'Does not send', value: 'does-not-send' },
        { label: 'Sends', value: 'sends' },
      ]);
    });

    it('should return fungible options for STX post condition type', () => {
      const options = getPostConditionConditionCodeOptions(PostConditionType.STX);
      expect(options).toHaveLength(5);
      expect(options).toEqual([
        { label: 'Equal', value: 'equal' },
        { label: 'Greater', value: 'greater' },
        { label: 'GreaterEqual', value: 'greater-equal' },
        { label: 'Less', value: 'less' },
        { label: 'LessEqual', value: 'less-equal' },
      ]);
    });

    it('should return fungible options for Fungible post condition type', () => {
      const options = getPostConditionConditionCodeOptions(PostConditionType.Fungible);
      expect(options).toHaveLength(5);
      expect(options).toEqual([
        { label: 'Equal', value: 'equal' },
        { label: 'Greater', value: 'greater' },
        { label: 'GreaterEqual', value: 'greater-equal' },
        { label: 'Less', value: 'less' },
        { label: 'LessEqual', value: 'less-equal' },
      ]);
    });
  });

  describe('extractPostConditionParams', () => {
    it('should extract post condition parameters from formik state', () => {
      const formikState = {
        // Function parameters
        someArg: 'value',
        anotherArg: 123,
        // Post condition parameters
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: 100,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-contract',
        postConditionAssetName: 'my-asset',
      };

      const result = extractPostConditionParams(formikState);
      expect(result).toEqual({
        postConditionMode: PostConditionMode.Deny,
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: 100,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-contract',
        postConditionAssetName: 'my-asset',
      });
    });

    it('should handle undefined post condition parameters', () => {
      const formikState = {
        someArg: 'value',
        postConditionMode: PostConditionMode.Allow,
        postConditionType: undefined as any,
        postConditionAddress: undefined as any,
        postConditionConditionCode: undefined as any,
        postConditionAmount: undefined as any,
        postConditionAssetAddress: undefined as any,
        postConditionAssetContractName: undefined as any,
        postConditionAssetName: undefined as any,
      };

      const result = extractPostConditionParams(formikState as any);
      expect(result).toEqual({
        postConditionMode: PostConditionMode.Allow,
        postConditionType: undefined,
        postConditionAddress: undefined,
        postConditionConditionCode: undefined,
        postConditionAmount: undefined,
        postConditionAssetAddress: undefined,
        postConditionAssetContractName: undefined,
        postConditionAssetName: undefined,
      });
    });
  });
});
