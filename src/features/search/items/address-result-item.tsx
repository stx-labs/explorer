import { Box, Flex, Icon } from '@chakra-ui/react';
import React from 'react';

import { Circle } from '../../../common/components/Circle';
import { AddressLink } from '../../../common/components/ExplorerLinks';
import { useAccountStxBalance } from '../../../common/queries/useAccountStxBalance';
import { FoundResult } from '../../../common/types/search-results';
import { microToStacksFormatted, truncateMiddleDeprecated } from '../../../common/utils/utils';
import WalletIcon from '../../../ui/icons/WalletIcon';
import { Caption, Title } from '../../../ui/typography';
import { ResultItemWrapper } from './result-item-wrapper';

interface AddressResultItemProps {
  result: FoundResult;
}

export const AddressResultItem: React.FC<AddressResultItemProps> = ({ result }) => {
  const principal = result.result.entity_id;
  const displayName =
    result.result.entity_type === 'standard_address' ? result.result.display_name : '';
  const truncatedPrincipal = truncateMiddleDeprecated(principal, 4);
  const { data: stxBalance } = useAccountStxBalance(principal);
  return (
    <AddressLink address={principal} className={`search-bar-result-1`}>
      <ResultItemWrapper>
        <Flex alignItems="center">
          <Circle h={12} w={12}>
            <Icon h={4} w={4}>
              <WalletIcon />
            </Icon>
          </Circle>
          <Box ml={4}>
            <Title display="block" mb="4px" className={'search-result-title'}>
              {displayName ? `${displayName} (${truncatedPrincipal})` : truncatedPrincipal}
            </Title>
            <Caption>{`${microToStacksFormatted(stxBalance?.balance || 0)} STX`}</Caption>
          </Box>
        </Flex>
      </ResultItemWrapper>
    </AddressLink>
  );
};
