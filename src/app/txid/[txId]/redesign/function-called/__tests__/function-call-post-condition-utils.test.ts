import {
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  PostConditionType,
  PoxConditionCode,
  postConditionToHex,
} from '@stacks/transactions';

import {
  PostConditionBuilderParameters,
  PostConditionParameters,
  checkPostConditionParameters,
  extractPostConditionParams,
  fungibleConditionCodeToComparator,
  getPostCondition,
  getPostConditionConditionCodeOptions,
  isConditionCodeValidForType,
  isFungibleConditionCode,
  isNonFungibleConditionCode,
  isPostConditionParameter,
  isPoxConditionCode,
  nonFungibleConditionCodeToComparator,
  poxConditionCodeToComparator,
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
      const params: PostConditionBuilderParameters = {
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
      const params: PostConditionBuilderParameters = {
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
      const params: PostConditionBuilderParameters = {
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
      const params: PostConditionBuilderParameters = {
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        // Missing condition code and amount
      };
      const result = getPostCondition(params);
      expect(result).toEqual(undefined);
    });

    it('should throw error for invalid amount (not uint128)', () => {
      const params: PostConditionBuilderParameters = {
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
      expect(options).toHaveLength(3);
      expect(options).toEqual([
        { label: 'Does not send', value: 'does-not-send' },
        { label: 'Sends', value: 'sends' },
        { label: 'May send', value: 'may-send' },
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

    it('should coerce string-typed numeric values from form state to numbers', () => {
      const formikState = {
        postConditionMode: '2' as any, // Formik may stringify numeric values
        postConditionType: '0' as any,
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: '1' as any,
        postConditionAmount: '100' as any,
        postConditionAssetAddress: undefined as any,
        postConditionAssetContractName: undefined as any,
        postConditionAssetName: undefined as any,
      };

      const result = extractPostConditionParams(formikState as any);
      expect(result.postConditionMode).toBe(PostConditionMode.Deny);
      expect(result.postConditionType).toBe(PostConditionType.STX);
      expect(result.postConditionConditionCode).toBe(FungibleConditionCode.Equal);
      expect(result.postConditionAmount).toBe(100);
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

describe('pox-5 post conditions', () => {
  it('recognizes PoX condition codes and keeps them distinct from asset codes', () => {
    expect(isPoxConditionCode(PoxConditionCode.MayPerform)).toBe(true);
    expect(isPoxConditionCode(FungibleConditionCode.Equal)).toBe(false);
    expect(isPoxConditionCode(NonFungibleConditionCode.MaybeSent)).toBe(false);
  });

  it('maps PoX condition codes to comparators', () => {
    expect(poxConditionCodeToComparator(PoxConditionCode.WillNotPerform)).toBe('will-not-perform');
    expect(poxConditionCodeToComparator(PoxConditionCode.MayPerform)).toBe('may-perform');
    expect(poxConditionCodeToComparator(PoxConditionCode.WillPerform)).toBe('will-perform');
  });

  it('maps the new NFT maybe-sent comparator', () => {
    expect(nonFungibleConditionCodeToComparator(NonFungibleConditionCode.MaybeSent)).toBe(
      'maybe-sent'
    );
  });

  it('builds a staking post condition', () => {
    const params: PostConditionBuilderParameters = {
      postConditionType: PostConditionType.Staking,
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: FungibleConditionCode.LessEqual,
      postConditionAmount: 1100000,
    };

    expect(getPostCondition(params)).toEqual({
      type: 'staking-postcondition',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      condition: 'lte',
      amount: '1100000',
    });
  });

  it('builds a pox post condition, which carries no amount', () => {
    const params: PostConditionBuilderParameters = {
      postConditionType: PostConditionType.PoX,
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: PoxConditionCode.WillPerform,
    };

    expect(getPostCondition(params)).toEqual({
      type: 'pox-postcondition',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      condition: 'will-perform',
    });
  });

  it('offers PoX condition codes for the PoX post condition type', () => {
    expect(getPostConditionConditionCodeOptions(PostConditionType.PoX).map(o => o.value)).toEqual([
      'will-not-perform',
      'may-perform',
      'will-perform',
    ]);
  });

  it('validates originator mode like deny mode, not like allow mode', () => {
    const params = {
      postConditionMode: PostConditionMode.Originator,
    } as PostConditionParameters;

    expect(checkPostConditionParameters(params)).toEqual({
      postConditionType: 'Post condition type is required',
    });
  });
});

describe('condition code / post condition type pairing', () => {
  it('accepts fungible codes for stx, fungible and staking', () => {
    [PostConditionType.STX, PostConditionType.Fungible, PostConditionType.Staking].forEach(type => {
      expect(isConditionCodeValidForType(type, FungibleConditionCode.Equal)).toBe(true);
      expect(isConditionCodeValidForType(type, PoxConditionCode.MayPerform)).toBe(false);
    });
  });

  it('accepts only its own codes for non-fungible and pox', () => {
    expect(
      isConditionCodeValidForType(PostConditionType.NonFungible, NonFungibleConditionCode.MaybeSent)
    ).toBe(true);
    expect(
      isConditionCodeValidForType(PostConditionType.NonFungible, FungibleConditionCode.Equal)
    ).toBe(false);
    expect(isConditionCodeValidForType(PostConditionType.PoX, PoxConditionCode.WillPerform)).toBe(
      true
    );
    expect(isConditionCodeValidForType(PostConditionType.PoX, FungibleConditionCode.Equal)).toBe(
      false
    );
  });

  it('reports a code left over from a previously selected type', () => {
    const errors = checkPostConditionParameters({
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.PoX,
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      // left behind by an earlier fungible selection
      postConditionConditionCode: FungibleConditionCode.Equal,
    });

    expect(errors.postConditionConditionCode).toBe(
      'Condition code does not match the selected post condition type'
    );
  });
});

describe('wallet serialization', () => {
  // connect 8.1.9 cannot serialize the pox-5 types itself, so callContract hands it
  // hex. These assert the objects we build survive that step, and carry the wire
  // type ids SIP-044 specifies: 0x03 staking, 0x04 pox.
  it('serializes a staking post condition to wire type 0x03', () => {
    const pc = getPostCondition({
      postConditionType: PostConditionType.Staking,
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: FungibleConditionCode.LessEqual,
      postConditionAmount: 1100000,
    });

    expect(postConditionToHex(pc!).startsWith('03')).toBe(true);
  });

  it('serializes a pox post condition to wire type 0x04', () => {
    const pc = getPostCondition({
      postConditionType: PostConditionType.PoX,
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: PoxConditionCode.WillPerform,
    });

    expect(postConditionToHex(pc!).startsWith('04')).toBe(true);
  });
});
