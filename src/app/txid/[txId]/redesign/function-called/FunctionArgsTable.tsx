import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { ColumnDef } from '@tanstack/react-table';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
} from '@stacks/stacks-blockchain-api-types';

import {
  NameCellRenderer,
  TypeCellRenderer,
  ValueCellRenderer,
} from './FunctionCalledTableCellRenderers';
import { formatClarityValue, getContractCallTxFunctionArgs } from './utils';

enum FunctionArgsTableColumns {
  Name = 'name',
  Value = 'value',
  Type = 'type',
}

export interface FunctionArgsTableData {
  [FunctionArgsTableColumns.Name]: string;
  [FunctionArgsTableColumns.Value]: string;
  [FunctionArgsTableColumns.Type]: string;
}

const columnDefinitions: ColumnDef<FunctionArgsTableData>[] = [
  {
    id: FunctionArgsTableColumns.Name,
    header: 'Name',
    accessorKey: FunctionArgsTableColumns.Name,
    cell: info => NameCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
  {
    id: FunctionArgsTableColumns.Value,
    header: 'Value',
    accessorKey: FunctionArgsTableColumns.Value,
    cell: info => ValueCellRenderer(info.getValue() as string),
    enableSorting: false,
    minSize: 150,
    maxSize: 150,
  },
  {
    id: FunctionArgsTableColumns.Type,
    header: 'Type',
    accessorKey: FunctionArgsTableColumns.Type,
    cell: info => TypeCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
];

export function FunctionArgsTable({
  tx,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
}) {
  const args = getContractCallTxFunctionArgs(tx);
  const formattedArgs = args.map(arg => formatClarityValue(arg));
  return <FunctionArgsDataTable data={formattedArgs} />;
}

/** Name/value/type table shared by transaction arguments and diagnosis details. */
export function FunctionArgsDataTable({ data }: { data: FunctionArgsTableData[] }) {
  return (
    <Table
      columns={columnDefinitions}
      data={data}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
    />
  );
}
