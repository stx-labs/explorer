import { AmountCellRenderer, AssetType } from '@/common/components/table/CommonTableCellRenderers';

import { PostCondition } from '@stacks/stacks-blockchain-api-types';

import { getAmount } from './post-condition-table-utils';

export function getAssetTypeFromPostConditionType(postConditionType: PostCondition['type']) {
  switch (postConditionType) {
    case 'stx':
      return AssetType.STX;
    case 'fungible':
      return AssetType.FUNGIBLE;
    case 'non_fungible':
      return AssetType.NON_FUNGIBLE;
    default:
      return undefined;
  }
}

export interface PostConditionAmountData {
  postCondition: PostCondition;
  ftDecimals?: number;
}

function getPostConditionAmountCellData(data: PostConditionAmountData) {
  const { postCondition, ftDecimals } = data;
  const postConditionType = postCondition.type;
  const { asset_name: assetName } = postConditionType !== 'stx' ? postCondition.asset : {};
  const amount = getAmount(postCondition);

  return {
    amount,
    assetType: getAssetTypeFromPostConditionType(postConditionType),
    assetName,
    decimals: ftDecimals,
  };
}

export const PostConditionAmountCellRenderer = (data: PostConditionAmountData) => {
  const { amount, assetType, assetName, decimals } = getPostConditionAmountCellData(data);

  return (
    <AmountCellRenderer
      amount={amount}
      assetType={assetType}
      assetName={assetName}
      decimals={decimals}
    />
  );
};
