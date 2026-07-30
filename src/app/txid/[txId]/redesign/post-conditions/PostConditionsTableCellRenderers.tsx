import { AmountCellRenderer, AssetType } from '@/common/components/table/CommonTableCellRenderers';

import { PostConditionWithStaking, getAmount } from './post-condition-table-utils';

export function getAssetTypeFromPostConditionType(
  postConditionType: PostConditionWithStaking['type']
) {
  switch (postConditionType) {
    case 'stx':
    // Staking post-conditions lock STX, so the amount renders as STX
    case 'staking':
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
  postCondition: PostConditionWithStaking;
  ftDecimals?: number;
}

function getPostConditionAmountCellData(data: PostConditionAmountData) {
  const { postCondition, ftDecimals } = data;
  const postConditionType = postCondition.type;
  // Only fungible and non_fungible post-conditions have an `asset` field
  const assetName =
    postCondition.type === 'fungible' || postCondition.type === 'non_fungible'
      ? postCondition.asset.asset_name
      : undefined;
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
