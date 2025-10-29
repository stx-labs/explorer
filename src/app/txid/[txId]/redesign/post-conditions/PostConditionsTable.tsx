import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressLinkCellRenderer,
  AddressLinkCellRendererProps,
  EllipsisText,
} from '@/common/components/table/CommonTableCellRenderers';
import { Table } from '@/common/components/table/Table';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { validateStacksContractId } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Flex } from '@chakra-ui/react';
import { ColumnDef, Header } from '@tanstack/react-table';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolSmartContractTransaction,
  PostCondition,
  PostConditionFungibleConditionCode,
  PostConditionNonFungibleConditionCode,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { PostConditionAmountCellRenderer } from './PostConditionsTableCellRenderers';

enum PostConditionsTableColumns {
  From = 'from',
  Condition = 'condition',
  AssetAmount = 'assetAmount',
  Principal = 'principal',
}

interface PostConditionsTableData {
  [PostConditionsTableColumns.From]: AddressLinkCellRendererProps;
  [PostConditionsTableColumns.Condition]: string;
  [PostConditionsTableColumns.AssetAmount]: PostCondition;
  [PostConditionsTableColumns.Principal]: AddressLinkCellRendererProps;
}

const columnDefinitions: ColumnDef<PostConditionsTableData>[] = [
  {
    id: PostConditionsTableColumns.From,
    header: 'From',
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
    minSize: 150,
    maxSize: 150,
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
        {PostConditionAmountCellRenderer(info.getValue() as PostCondition)}
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

interface PostConditionTableData {
  from: AddressLinkCellRendererProps;
  condition: string;
  assetAmount: PostCondition;
  principal: AddressLinkCellRendererProps;
}

type PostConditionConditionCode =
  | PostConditionFungibleConditionCode
  | PostConditionNonFungibleConditionCode;

function getPostConditionCellText(postConditionCode: PostConditionConditionCode): string {
  if (postConditionCode === 'sent_equal_to') {
    return 'Transfers exactly';
  }
  if (postConditionCode === 'sent_greater_than') {
    return 'Transfers more than';
  }
  if (postConditionCode === 'sent_greater_than_or_equal_to') {
    return 'Transfers at least';
  }
  if (postConditionCode === 'sent_less_than') {
    return 'Transfers less than';
  }
  if (postConditionCode === 'sent_less_than_or_equal_to') {
    return 'Transfers at most';
  }
  if (postConditionCode === 'sent') {
    return 'Must transfer';
  }
  if (postConditionCode === 'not_sent') {
    return 'Must not transfer';
  }
  return 'Undefined post condition code';
}

function getRowData(
  tx:
    | ContractCallTransaction
    | MempoolContractCallTransaction
    | SmartContractTransaction
    | MempoolSmartContractTransaction
): PostConditionTableData[] {
  const { post_conditions: postConditions } = tx;
  const senderAddress = tx.sender_address;
  const isContract = validateStacksContractId(senderAddress);
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

    return {
      [PostConditionsTableColumns.From]: from,
      [PostConditionsTableColumns.Condition]: getPostConditionCellText(
        postCondition.condition_code
      ),
      [PostConditionsTableColumns.AssetAmount]: postCondition,
      [PostConditionsTableColumns.Principal]: principalAddress,
    };
  });
}

export function PostConditionsTable({
  tx,
}: {
  tx:
    | ContractCallTransaction
    | MempoolContractCallTransaction
    | SmartContractTransaction
    | MempoolSmartContractTransaction;
}) {
  const rowData = getRowData(tx);
  return (
    <Table
      columns={columnDefinitions}
      data={rowData}
      emptyTableUi={
        <Flex alignItems="center" justifyContent="center">
          <Text textStyle="text-regular-sm" color="textTertiary">
            No post-conditions to show
          </Text>
        </Flex>
      }
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
    />
  );
}
