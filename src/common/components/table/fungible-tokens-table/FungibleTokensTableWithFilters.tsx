import { Switch } from '@/components/ui/switch';
import { Input } from '@/ui/Input';
import { Text } from '@/ui/Text';
import { Flex, Icon, InputGroup, Stack } from '@chakra-ui/react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useState } from 'react';

import { FungibleTokensTable, FungibleTokensTableProps } from './FungibleTokensTable';

export function FungibleTokensTableWithFilters({
  principal,
  pageSize,
  ...tableProps
}: FungibleTokensTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideSuspiciousTokens, setHideSuspiciousTokens] = useState(false);
  const [hideZeroBalanceTokens, setHideZeroBalanceTokens] = useState(false);

  return (
    <Stack gap={4}>
      <Flex gap={4} alignItems="center">
        <InputGroup
          startElement={
            <Icon h={4} w={4}>
              <MagnifyingGlass />
            </Icon>
          }
          w={'220px'}
        >
          <Input
            placeholder="Search token..."
            variant="redesignPrimary"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <Flex gap={2} alignItems="center">
          <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
            Hide suspicious tokens
          </Text>
          <Switch
            id="hide-suspicious-tokens-switch"
            onCheckedChange={() => setHideSuspiciousTokens(!hideSuspiciousTokens)}
            checked={hideSuspiciousTokens}
          />
        </Flex>
        <Flex gap={2} alignItems="center">
          <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
            Hide zero balance tokens
          </Text>
          <Switch
            id="hide-zero-balance-tokens-switch"
            onCheckedChange={() => setHideZeroBalanceTokens(!hideZeroBalanceTokens)}
            checked={hideZeroBalanceTokens}
          />
        </Flex>
      </Flex>
      <FungibleTokensTable
        filters={{ searchTerm, hideSuspiciousTokens, hideZeroBalanceTokens }}
        principal={principal}
        pageSize={pageSize}
        {...tableProps}
      />
    </Stack>
  );
}
