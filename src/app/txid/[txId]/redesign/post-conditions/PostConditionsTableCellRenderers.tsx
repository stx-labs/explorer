import { AmountCellRenderer, AssetType } from '@/common/components/table/CommonTableCellRenderers';
import { useFtMetadata } from '@/common/queries/useFtMetadata';

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

function usePostConditonAnountCellData(postCondition: PostCondition) {
  const postConditionType = postCondition.type;
  const {
    asset_name: assetName,
    contract_address: contractAddress,
    contract_name: contractName,
  } = postConditionType !== 'stx' ? postCondition.asset : {};
  const contractId = `${contractAddress}.${contractName}`;
  const shouldFetchMetadata = postConditionType === 'fungible' && !!contractId;
  const ftMetadata = useFtMetadata(contractId, {
    enabled: shouldFetchMetadata,
  });
  const ftDecimals = ftMetadata.data?.decimals;
  const amount = getAmount(postCondition);

  return {
    amount,
    assetType: getAssetTypeFromPostConditionType(postConditionType),
    assetName,
    decimals: ftDecimals,
  };
}

export const PostConditionAmountCellRenderer = (postCondition: PostCondition) => {
  const { amount, assetType, assetName, decimals } = usePostConditonAnountCellData(postCondition);

  return (
    <AmountCellRenderer
      amount={amount}
      assetType={assetType}
      assetName={assetName}
      decimals={decimals}
    />
  );
};
