import { FungibleConditionCode, PostConditionMode, PostConditionType } from '@stacks/transactions';

import { FunctionFormikState } from '../FunctionView';
import { checkPostConditionParameters } from '../PostConditionForm';

describe('checkPostConditionParameters', () => {
  // TODO: fix this test
  it('should return no errors when post condition is not enabled', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Allow,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAmount: 12345,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({});
  });

  it('should return no errors when all values are correct', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAmount: 12345,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({});
  });

  it('should return no errors if postConditionType is missing in deny mode', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: undefined,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAmount: 12345,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({});
  });

  it('should return error if postConditionConditionCode is missing', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: undefined,
      postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAmount: 12345,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({
      postConditionConditionCode: 'Condition Code is required',
    });
  });

  it('should return error for invalid Stacks address', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'INVALID_ADDRESS',
      postConditionAmount: 12345,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({
      postConditionAddress: 'Invalid Stacks address',
    });
  });

  it('should return error if postConditionAmount is not a valid number', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAmount: -1,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: 'asset-contract-name',
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({
      postConditionAmount: 'Invalid amount',
    });
  });

  it('should return multiple errors if there are multiple errors', () => {
    const pcValues: FunctionFormikState = {
      postConditionMode: PostConditionMode.Deny,
      postConditionType: PostConditionType.Fungible,
      postConditionConditionCode: FungibleConditionCode.Equal,
      postConditionAddress: 'INVALID_ADDRESS',
      postConditionAmount: -1,
      postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      postConditionAssetContractName: undefined,
      postConditionAssetName: 'asset-name',
    } as FunctionFormikState;

    expect(checkPostConditionParameters(pcValues)).toEqual({
      postConditionAmount: 'Invalid amount',
      postConditionAddress: 'Invalid Stacks address',
      postConditionAssetContractName: 'Asset Contract Name is required',
    });
  });
});
