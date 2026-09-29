import {
  Cl,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionType,
  PoxConditionCode,
  postConditionToHex,
} from '@stacks/transactions';

import {
  PostConditionParameters,
  checkPostConditionParameters,
  checkPostConditions,
  getPostCondition,
  getPostConditions,
} from '../PostConditionForm';

const originalTextEncoder = global.TextEncoder;

beforeAll(() => {
  Object.assign(global, {
    TextEncoder: class TextEncoder {
      encode(value: string) {
        return Uint8Array.from(Buffer.from(value));
      }
    },
  });
});

afterAll(() => {
  Object.assign(global, { TextEncoder: originalTextEncoder });
});

const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const contractPrincipal = `${address}.asset-contract-name`;
const asset = `${contractPrincipal}::asset-name`;

const validFungiblePostCondition: PostConditionParameters = {
  postConditionType: PostConditionType.Fungible,
  postConditionConditionCode: FungibleConditionCode.Equal,
  postConditionAddress: 'origin',
  postConditionAmount: '12345',
  postConditionAsset: asset,
};

describe('checkPostConditionParameters', () => {
  it('requires a type for every added post condition', () => {
    expect(checkPostConditionParameters({})).toEqual({
      postConditionType: 'Post-condition type is required',
    });
  });

  it('accepts origin, standard principals, and contract principals', () => {
    expect(checkPostConditionParameters(validFungiblePostCondition)).toEqual({});
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAddress: address,
      })
    ).toEqual({});
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAddress: contractPrincipal,
      })
    ).toEqual({});
  });

  it('trims values before validating and constructing a post condition', () => {
    const params = {
      ...validFungiblePostCondition,
      postConditionAddress: `  ${address}  `,
      postConditionAsset: `  ${asset}  `,
      postConditionAmount: '  12345  ',
    };

    expect(checkPostConditionParameters(params)).toEqual({});
    expect(getPostCondition(params)).toEqual({
      type: 'ft-postcondition',
      address,
      condition: 'eq',
      asset,
      amount: '12345',
    });
  });

  it('accepts the maximum u64 amount as a string without losing precision', () => {
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAmount: '18446744073709551615',
      })
    ).toEqual({});
  });

  it('returns an error when the condition code is missing', () => {
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionConditionCode: undefined,
      })
    ).toEqual({
      postConditionConditionCode: 'Condition Code is required',
    });
  });

  it('returns an error for an invalid principal', () => {
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAddress: 'INVALID_ADDRESS',
      })
    ).toEqual({
      postConditionAddress: 'Enter origin, a Stacks address, or a contract principal',
    });
  });

  it.each(['-1', '1.5', '1e3', '18446744073709551616'])(
    'returns an error for invalid amount %s',
    postConditionAmount => {
      expect(
        checkPostConditionParameters({
          ...validFungiblePostCondition,
          postConditionAmount,
        })
      ).toEqual({
        postConditionAmount: 'Enter an integer from 0 to 18446744073709551615',
      });
    }
  );

  it('validates fully-qualified assets and NFT Clarity identifiers', () => {
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAsset: `${address}.bad.contract::asset`,
      })
    ).toEqual({
      postConditionAsset: 'Enter an asset identifier in address.contract::token format',
    });
    expect(
      checkPostConditionParameters({
        postConditionType: PostConditionType.NonFungible,
        postConditionConditionCode: NonFungibleConditionCode.Sends,
        postConditionAddress: 'origin',
        postConditionAsset: asset,
        postConditionAssetId: 'not clarity',
      })
    ).toEqual({ postConditionAssetId: 'Enter a valid Clarity value, such as u1' });
  });

  it('returns every field error for one post condition', () => {
    expect(
      checkPostConditionParameters({
        ...validFungiblePostCondition,
        postConditionAddress: 'INVALID_ADDRESS',
        postConditionAmount: '-1',
        postConditionAsset: undefined,
      })
    ).toEqual({
      postConditionAmount: 'Enter an integer from 0 to 18446744073709551615',
      postConditionAddress: 'Enter origin, a Stacks address, or a contract principal',
      postConditionAsset: 'Asset identifier is required',
    });
  });

  it('keeps validation errors aligned with their post-condition index', () => {
    expect(checkPostConditions([validFungiblePostCondition, {}])).toEqual([
      {},
      { postConditionType: 'Post-condition type is required' },
    ]);
  });
});

describe('post-condition builders', () => {
  it('builds every supported post-condition type into serializable wire data', () => {
    const postConditions = getPostConditions([
      {
        postConditionType: PostConditionType.STX,
        postConditionAddress: 'origin',
        postConditionConditionCode: FungibleConditionCode.Equal,
        postConditionAmount: '100',
      },
      validFungiblePostCondition,
      {
        postConditionType: PostConditionType.NonFungible,
        postConditionAddress: contractPrincipal,
        postConditionConditionCode: NonFungibleConditionCode.Sends,
        postConditionAsset: asset,
        postConditionAssetId: 'u42',
      },
      {
        postConditionType: PostConditionType.Staking,
        postConditionAddress: address,
        postConditionConditionCode: FungibleConditionCode.LessEqual,
        postConditionAmount: '1100000',
      },
      {
        postConditionType: PostConditionType.PoX,
        postConditionAddress: 'origin',
        postConditionConditionCode: PoxConditionCode.WillPerform,
      },
    ]);

    expect(postConditions).toEqual([
      { type: 'stx-postcondition', address: 'origin', condition: 'eq', amount: '100' },
      {
        type: 'ft-postcondition',
        address: 'origin',
        condition: 'eq',
        asset,
        amount: '12345',
      },
      {
        type: 'nft-postcondition',
        address: contractPrincipal,
        condition: 'sent',
        asset,
        assetId: Cl.uint(42),
      },
      {
        type: 'staking-postcondition',
        address,
        condition: 'lte',
        amount: '1100000',
      },
      { type: 'pox-postcondition', address: 'origin', condition: 'will-perform' },
    ]);
    expect(() => postConditions.map(postConditionToHex)).not.toThrow();
  });

  it('builds multiple post conditions in form order', () => {
    expect(
      getPostConditions([
        {
          postConditionType: PostConditionType.STX,
          postConditionAddress: address,
          postConditionConditionCode: FungibleConditionCode.LessEqual,
          postConditionAmount: '18446744073709551615',
        },
        {
          postConditionType: PostConditionType.PoX,
          postConditionAddress: address,
          postConditionConditionCode: PoxConditionCode.WillPerform,
        },
      ])
    ).toEqual([
      {
        type: 'stx-postcondition',
        address,
        condition: 'lte',
        amount: '18446744073709551615',
      },
      { type: 'pox-postcondition', address, condition: 'will-perform' },
    ]);
  });

  it('throws rather than silently dropping an invalid configured condition', () => {
    expect(() =>
      getPostCondition({
        postConditionType: PostConditionType.PoX,
        postConditionAddress: address,
        postConditionConditionCode: FungibleConditionCode.Equal,
      })
    ).toThrow('Invalid PoX Post Condition configuration');
  });
});
