import { RISKY_TOKENS, VERIFIED_TOKENS } from '@/app/token/[tokenId]/consts';
import { Flex, Icon, Table } from '@chakra-ui/react';
import { FtBasicMetadataResponse } from '@hirosystems/token-metadata-api-client';
import { SealCheck, Warning } from '@phosphor-icons/react';
import { FC, useMemo } from 'react';

import { TokenLink, TxLink } from '../../../common/components/ExplorerLinks';
import { abbreviateNumber, getFtDecimalAdjustedBalance } from '../../../common/utils/utils';
import { Text } from '../../../ui/Text';
import { TokenAvatar } from '../../address/[principal]/TokenBalanceCard/TokenAvatar';
import { isSBTC, referencesSBTC } from '../utils';

export const TokenRow: FC<{
  ftToken: FtBasicMetadataResponse;
}> = ({ ftToken }) => {
  const name = ftToken.name || 'FT Token';
  const symbol = ftToken.symbol || '';
  const contractId = ftToken.contract_principal;

  const includesSbtc = referencesSBTC(name, symbol);
  const isSbtc = isSBTC(contractId);

  const tokenBadge = useMemo(() => {
    if (isSbtc || VERIFIED_TOKENS.includes(contractId)) {
      return (
        <Flex
          px={1.5}
          py={1}
          bg="green.300"
          borderRadius="2xl"
          border="1px solid var(--stacks-colors-green-500)"
        >
          <Icon h={3} w={3} color="green.600">
            <SealCheck />
          </Icon>
        </Flex>
      );
    }
    if ((includesSbtc && !isSbtc) || RISKY_TOKENS.includes(contractId)) {
      return (
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
      );
    }
    return null;
  }, [contractId, includesSbtc, isSbtc]);

  return (
    <Table.Row>
      <Table.Cell padding={'10px 20px 10px 16px'} width={['auto', 'auto', '30%']}>
        <Flex alignItems={'center'} gap={'8px'}>
          <TokenAvatar metadataImageUrl={ftToken.image_uri} asset={ftToken.symbol || 'FT'} />
          <TokenLink
            tokenId={contractId}
            fontSize={'sm'}
            whiteSpace={'nowrap'}
            textOverflow={'ellipsis'}
            overflow={'hidden'}
          >
            {name} {ftToken.symbol ? `(${ftToken.symbol})` : null}
          </TokenLink>
          {tokenBadge}
        </Flex>
      </Table.Cell>
      <Table.Cell padding={'10px'} display={['none', 'none', 'table-cell']}>
        <Text fontSize={'md'} whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow={'hidden'}>
          <TxLink txId={ftToken.tx_id}>{ftToken.tx_id}</TxLink>
        </Text>
      </Table.Cell>
      <Table.Cell width={'130px'} padding={'10px 16px 10px 20px'}>
        <Text whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow={'hidden'} fontSize={'md'}>
          {ftToken.total_supply
            ? abbreviateNumber(
                getFtDecimalAdjustedBalance(ftToken.total_supply, ftToken.decimals || 0),
                2
              )
            : 'N/A'}
        </Text>
      </Table.Cell>
    </Table.Row>
  );
};
