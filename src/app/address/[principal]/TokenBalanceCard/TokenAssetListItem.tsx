'use client';

import { RISKY_NFTS } from '@/app/token/[tokenId]/consts';
import { isRiskyNFTContract } from '@/app/token/[tokenId]/utils';
import { Flex, FlexProps, Icon } from '@chakra-ui/react';
import { Warning } from '@phosphor-icons/react';
import React from 'react';

import { NonFungibleTokenHolding } from '@stacks/stacks-blockchain-api-types/generated';
import { cvToJSON, hexToCV } from '@stacks/transactions';

import { AddressLink } from '../../../../common/components/ExplorerLinks';
import { TwoColsListItem } from '../../../../common/components/TwoColumnsListItem';
import { FtTokenAmount, NftTokenAmount } from '../../../../common/components/balances/TokenAmount';
import { FtTokenSymbol, NftTokenSymbol } from '../../../../common/components/balances/TokenSymbol';
import { useFtMetadata } from '../../../../common/queries/useFtMetadata';
import { TOKENS_WITH_METADATA_NAME_OVERRIDE } from '../../../../common/utils/token-display-name';
import { getAssetNameParts, initBigNumber } from '../../../../common/utils/utils';
import { FtAvatar } from './FtAvatar';
import { FtTokenLink } from './FtTokenLink';
import { NftAvatar } from './NftAvatar';

interface TokenAssetListItemProps extends FlexProps {
  amount: string;
  token: string;
  tokenType: 'non_fungible_tokens' | 'fungible_tokens';
  bnsName?: string;
  holdings?: NonFungibleTokenHolding[];
}

export const TokenAssetListItem: React.FC<TokenAssetListItemProps> = ({
  amount,
  token,
  tokenType,
  bnsName,
  holdings,
}) => {
  const { address, asset, contract } = getAssetNameParts(token);
  const contractId = `${address}.${contract}`;

  // Only fetch metadata for specific tokens with known name mismatches
  const needsMetadata =
    tokenType === 'fungible_tokens' && TOKENS_WITH_METADATA_NAME_OVERRIDE.includes(contractId);

  const { data: ftMetadata } = useFtMetadata(needsMetadata ? contractId : undefined);

  const firstNftValue = (() => {
    if (!holdings?.length) return undefined;
    try {
      const decoded = cvToJSON(hexToCV(holdings[0].value.hex));
      if (decoded?.type === 'int' || decoded?.type === 'uint') {
        return BigInt(decoded.value);
      }
    } catch {}
    return undefined;
  })();

  if (initBigNumber(amount).isLessThanOrEqualTo(0)) return null;

  return (
    <TwoColsListItem
      icon={
        tokenType === 'non_fungible_tokens' ? (
          <NftAvatar
            asset={asset}
            token={token}
            contractId={contractId}
            firstNftValue={firstNftValue}
          />
        ) : (
          <FtAvatar token={token} contractId={contractId} />
        )
      }
      leftContent={{
        title:
          tokenType === 'non_fungible_tokens' ? (
            <AddressLink principal={`${address}.${contract}`}>{bnsName || asset}</AddressLink>
          ) : (
            <FtTokenLink
              contractId={contractId}
              asset={asset}
              bnsName={bnsName}
              ftMetadata={ftMetadata}
            />
          ),
        subtitle:
          tokenType === 'non_fungible_tokens' ? (
            <NftTokenSymbol asset={asset} />
          ) : (
            <FtTokenSymbol asset={asset} contractId={contractId} ftMetadata={ftMetadata} />
          ),
      }}
      rightContent={{
        title:
          tokenType === 'non_fungible_tokens' ? (
            <NftTokenAmount amount={amount} />
          ) : (
            <FtTokenAmount amount={amount} contractId={contractId} />
          ),
        subtitle:
          tokenType === 'non_fungible_tokens' &&
          (isRiskyNFTContract(contractId) || RISKY_NFTS.includes(contractId)) ? (
            <Flex
              px={1.5}
              py={1}
              bg="red.200"
              borderRadius="2xl"
              border="1px solid var(--stacks-colors-red-500)"
            >
              <Icon h={3} w={3} color="red.600">
                <Warning />
              </Icon>
            </Flex>
          ) : null,
      }}
    />
  );
};
