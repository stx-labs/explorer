'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressLinkCellRenderer,
  AddressLinkCellRendererProps,
  EllipsisText,
} from '@/common/components/table/CommonTableCellRenderers';
import { Table } from '@/common/components/table/Table';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { useBulkFtMetadata } from '@/common/queries/useBulkTokenMetadata';
import { validateStacksContractId } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Box, Flex } from '@chakra-ui/react';
import { ColumnDef, Header } from '@tanstack/react-table';
import { useMemo } from 'react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import {
  PostConditionAmountCellRenderer,
  PostConditionAmountData,
} from './PostConditionsTableCellRenderers';
import { ExtendedPostCondition, getPostConditionCellText } from './post-condition-table-utils';

enum PostConditionsTableColumns {
  From = 'from',
  Condition = 'condition',
  AssetAmount = 'assetAmount',
  Principal = 'principal',
}

interface PostConditionsTableData {
  [PostConditionsTableColumns.From]: AddressLinkCellRendererProps;
  [PostConditionsTableColumns.Condition]: string;
  [PostConditionsTableColumns.AssetAmount]: PostConditionAmountData;
  [PostConditionsTableColumns.Principal]: AddressLinkCellRendererProps;
}

const columnDefinitions: ColumnDef<PostConditionsTableData>[] = [
  {
    id: PostConditionsTableColumns.From,
    header: 'By',
    accessorKey: PostConditionsTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.getValue() as AddressLinkCellRendererProps),
    enableSorting: false,
  },
  {
    id: PostConditionsTableColumns.Condition,
    header: 'Condition',
    accessorKey: PostConditionsTableColumns.Condition,
    cell: info => (
      <EllipsisText textStyle="text-medium-sm">{info.getValue() as string}</EllipsisText>
    ),
    enableSorting: false,
    minSize: 230,
    maxSize: 230,
  },
  {
    id: PostConditionsTableColumns.AssetAmount,
    header: ({ header }: { header: Header<PostConditionsTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Asset/Amount</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: PostConditionsTableColumns.AssetAmount,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end">
        {PostConditionAmountCellRenderer(info.getValue() as PostConditionAmountData)}
      </Flex>
    ),
    enableSorting: false,
  },
  {
    id: PostConditionsTableColumns.Principal,
    header: ({ header }: { header: Header<PostConditionsTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-start" w="full">
        <DefaultTableColumnHeader header={header}>Principal</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: PostConditionsTableColumns.Principal,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-start">
        {AddressLinkCellRenderer(info.getValue() as AddressLinkCellRendererProps)}
      </Flex>
    ),
    enableSorting: false,
  },
];

type TxWithPostConditions =
  | ContractCallTransaction
  | MempoolContractCallTransaction
  | SmartContractTransaction
  | MempoolSmartContractTransaction;

export function PostConditionsTable({
  tx,
  highlightIndex,
}: {
  tx: TxWithPostConditions;
  /** Row to emphasise (0-based), e.g. the post-condition implicated in a failure. */
  highlightIndex?: number;
}) {
  const postConditions: ExtendedPostCondition[] = tx.post_conditions;
  const senderAddress = tx.sender_address;
  const isContract = validateStacksContractId(senderAddress);

  // Extract unique FT contract IDs for bulk metadata fetch
  const ftContractIds = useMemo(() => {
    const ids = new Set<string>();
    postConditions.forEach(pc => {
      if (pc.type === 'fungible') {
        const { contract_address, contract_name } = pc.asset;
        if (contract_address && contract_name) ids.add(`${contract_address}.${contract_name}`);
      }
    });
    return Array.from(ids);
  }, [postConditions]);

  const { metadataMap } = useBulkFtMetadata(ftContractIds);

  const rowData: PostConditionsTableData[] = useMemo(() => {
    const from = { address: senderAddress, isContract };
    return postConditions.map(postCondition => {
      const principal = postCondition.principal;
      const principalAddress =
        principal.type_id === 'principal_origin'
          ? { address: from.address, isContract: from.isContract }
          : principal.type_id === 'principal_contract'
            ? {
                address: `${principal.address}.${principal.contract_name}`,
                isContract: true,
              }
            : {
                address: principal.address,
                isContract: false,
              };

      let ftDecimals: number | undefined;
      if (postCondition.type === 'fungible') {
        const { contract_address, contract_name } = postCondition.asset;
        const metadata = metadataMap.get(`${contract_address}.${contract_name}`);
        ftDecimals = metadata?.decimals;
      }

      return {
        [PostConditionsTableColumns.From]: from,
        [PostConditionsTableColumns.Condition]: getPostConditionCellText(
          postCondition.condition_code,
          postCondition.type
        ),
        [PostConditionsTableColumns.AssetAmount]: { postCondition, ftDecimals },
        [PostConditionsTableColumns.Principal]: principalAddress,
      };
    });
  }, [postConditions, senderAddress, isContract, metadataMap]);

  const validHighlight =
    highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < postConditions.length;

  return (
    <Box data-highlighted-row={validHighlight ? highlightIndex : undefined}>
      <Table
        columns={columnDefinitions}
        data={rowData}
        getRowProps={(_row, rowIndex) =>
          validHighlight && rowIndex === highlightIndex
            ? {
                bg: { base: 'feedback.red-150', _dark: 'transactionStatus.failed' },
                'data-highlighted': 'true',
              }
            : {}
        }
        emptyTableUi={
          <Flex alignItems="center" justifyContent="center">
            <Text textStyle="text-regular-sm" color="textTertiary">
              No post-conditions to show
            </Text>
          </Flex>
        }
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      />
    </Box>
  );
}
