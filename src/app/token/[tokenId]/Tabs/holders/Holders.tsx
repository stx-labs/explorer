import { Flex, Table } from '@chakra-ui/react';
import styled from '@emotion/styled';
import { ReactNode, Suspense, useMemo } from 'react';

import { AddressLink } from '../../../../../common/components/ExplorerLinks';
import { ListFooter } from '../../../../../common/components/ListFooter';
import { Section } from '../../../../../common/components/Section';
import { useSuspenseInfiniteQueryResult } from '../../../../../common/hooks/useInfiniteQueryResult';
import { useContractById } from '../../../../../common/queries/useContractById';
import { useFtMetadata } from '../../../../../common/queries/useFtMetadata';
import { ftDecimals, truncateMiddleDeprecated } from '../../../../../common/utils/utils';
import { Text } from '../../../../../ui/Text';
import { ScrollableBox } from '../../../../_components/BlockList/ScrollableDiv';
import { mobileBorderCss } from '../../../../_components/BlockList/consts';
import { ExplorerErrorBoundary } from '../../../../_components/ErrorBoundary';
import { MergedTokenData } from '../../types';
import { HolderInfo, HolderResponseType, useSuspenseFtHolders } from '../data/useHolders';
import { HoldersTableSkeleton } from './skeleton';

const StyledTable = styled(Table.Root)`
  th {
    border-bottom: none;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

export const HoldersTableHeader = ({
  headerTitle,
  isFirst,
}: {
  headerTitle: string;
  isFirst: boolean;
}) => (
  <Table.ColumnHeader
    py={3}
    px={6}
    border="none"
    css={isFirst ? mobileBorderCss : {}}
    width="fit-content"
  >
    <Flex
      bg="hoverBackground"
      px={2.5}
      py={2}
      borderRadius="md"
      justifyContent="center"
      alignItems="center"
      width="fit-content"
    >
      <Text
        fontWeight="medium"
        whiteSpace="nowrap"
        fontSize="xs"
        color={'table.header.text'}
        textTransform="none"
        letterSpacing="normal"
      >
        {headerTitle}
      </Text>
    </Flex>
  </Table.ColumnHeader>
);

type HeaderValue = '#' | 'Address' | 'Quantity' | 'Percentage' | 'Value';
export const holdersTableHeaders: HeaderValue[] = [
  '#',
  'Address',
  'Quantity',
  'Percentage',
  'Value',
];

export const HoldersTableHeaders = ({ hasPrice }: { hasPrice: boolean }) => (
  <Table.Row>
    {holdersTableHeaders.map((header, i) => {
      return !hasPrice && header === 'Value' ? null : (
        <HoldersTableHeader
          key={`holders-table-header-${header}`}
          headerTitle={header}
          isFirst={i === 0}
        />
      );
    })}
  </Table.Row>
);

interface HolderRowInfo {
  address: string;
  balance: string;
  percentage: string;
  value: string;
}

function generateHolderRowInfo(
  address: string,
  balance: number,
  totalSupply: number,
  tokenPrice: number | null | undefined,
  decimals: number | undefined
): HolderRowInfo {
  return {
    address,
    balance: ftDecimals(balance, decimals || 0).toLocaleString(),
    percentage: `${((balance / totalSupply) * 100).toFixed(2).toLocaleString()}%`,
    value:
      typeof tokenPrice === 'number' ? (balance * tokenPrice).toFixed(2).toLocaleString() : 'N/A',
  };
}

const HolderTableRow = ({
  index,
  isFirst,
  isLast,
  address,
  balance,
  percentage,
  value,
}: {
  index: number;
  isFirst: boolean;
  isLast: boolean;
} & HolderRowInfo) => {
  const hasPrice = !!!value;
  return (
    <Table.Row
      style={{
        borderTop: isFirst ? 'none' : '',
        borderBottom: isLast ? 'none' : '',
      }}
    >
      <Table.Cell py={3} px={6} css={mobileBorderCss}>
        <Text whiteSpace="nowrap" fontSize="sm" pl={2}>
          {index + 1}
        </Text>
      </Table.Cell>

      <Table.Cell py={3} px={6}>
        <AddressLink principal={address} whiteSpace="nowrap" fontSize="sm" color="textSubdued">
          {truncateMiddleDeprecated(address)}
        </AddressLink>
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {balance}
        </Text>
      </Table.Cell>

      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {percentage}
        </Text>
      </Table.Cell>
      {hasPrice ? (
        <Table.Cell py={3} px={6}>
          <Text whiteSpace="nowrap" fontSize="sm">
            {value}
          </Text>
        </Table.Cell>
      ) : null}
    </Table.Row>
  );
};

export function HoldersTableLayout({
  numHolders,
  holdersTableHeaders,
  holdersTableRows,
}: {
  numHolders: ReactNode;
  holdersTableHeaders: ReactNode;
  holdersTableRows: ReactNode;
}) {
  return (
    <Section title={numHolders}>
      <ScrollableBox>
        <StyledTable width="full">
          <Table.Header>{holdersTableHeaders}</Table.Header>
          <Table.Body>{holdersTableRows}</Table.Body>
        </StyledTable>
      </ScrollableBox>
    </Section>
  );
}

const HoldersTableBase = ({
  tokenId,
  tokenInfo,
}: {
  tokenId: string;
  tokenInfo: MergedTokenData;
}) => {
  const tokenPrice = tokenInfo.extended?.currentPrice;
  // TODO: use asset id from token metadata. api is going to add it soon
  const { data: contract } = useContractById(tokenId);
  const ftName = contract?.abi?.fungible_tokens[0].name;
  const response = useSuspenseFtHolders(`${tokenId}::${ftName}`);
  const { isFetchingNextPage, fetchNextPage, hasNextPage } = response;
  const { total: totalNumHolders, total_supply: totalSupply } = response.data.pages[0];
  const holderBalances = useSuspenseInfiniteQueryResult<HolderInfo, HolderResponseType>(response);
  const filteredHolderBalances = holderBalances.filter(holder => holder.balance !== '0');
  const { data: tokenMetadata } = useFtMetadata(contract?.contract_id);
  const decimals = useMemo(() => tokenMetadata?.decimals, [tokenMetadata]);

  if (!holderBalances || !totalNumHolders || !totalSupply) {
    throw new Error('Holders data is not available');
  }

  return (
    <>
      <HoldersTableLayout
        numHolders={<Text fontWeight="medium">{totalNumHolders.toLocaleString()} Holders</Text>}
        holdersTableHeaders={<HoldersTableHeaders hasPrice={!!tokenPrice} />}
        holdersTableRows={filteredHolderBalances.map((holder, i) => {
          const { address, balance } = holder;
          return (
            <HolderTableRow
              key={`holders-table-row-${address}`}
              index={i}
              {...generateHolderRowInfo(
                address,
                parseInt(balance),
                parseInt(totalSupply),
                tokenPrice,
                decimals
              )}
              isFirst={i === 0}
              isLast={i === holderBalances.length - 1}
            />
          );
        })}
      />
      <ListFooter
        isLoading={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        label={''}
      />
    </>
  );
};

const HoldersTable = ({ tokenId, tokenInfo }: { tokenId: string; tokenInfo: MergedTokenData }) => {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{
        title: 'Holders',
        gridColumnStart: ['1', '1', '2'],
        gridColumnEnd: ['2', '2', '3'],
        minWidth: 0,
      }}
      tryAgainButton
    >
      <Suspense fallback={<HoldersTableSkeleton />}>
        <HoldersTableBase tokenId={tokenId} tokenInfo={tokenInfo} />
      </Suspense>
    </ExplorerErrorBoundary>
  );
};

export default HoldersTable;
