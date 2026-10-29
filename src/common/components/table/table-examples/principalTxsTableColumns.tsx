import {
  AddressLinkCellRenderer,
  FeeCellRenderer,
} from '@/common/components/table/CommonTableCellRenderers';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { TransactionSummary } from '@/common/types/tx-v3';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { getV3ToAddress } from '@/features/txs-list/utils';
import { V3StxPrice } from '@/features/txs-list/v3/V3StxPrice';
import { Flex } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { ColumnDef, Header } from '@tanstack/react-table';

import {
  IconCellRenderer,
  TimeStampCellRenderer,
  TxLinkCellRenderer,
  TxSummaryTitleCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TxTableAddressColumnData } from './TxsTable';
import { TxTableColumns } from './types';

/** Row shape for the account/contract/token transaction tables, built from a v3 {@link TransactionSummary}. */
export interface PrincipalTxTableData {
  [TxTableColumns.Transaction]: TransactionSummary;
  [TxTableColumns.TxType]: TransactionSummary['type'];
  [TxTableColumns.TxId]: string;
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.ArrowRight]: null;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.BlockTime]: number;
}

// The transaction title, with the inline USD value badge for token transfers (toggle-aware via the
// ShowValueMenu) — restoring the value cell the summary list showed before these tables.
function TransactionTitleCell({ tx }: { tx: TransactionSummary }) {
  if (tx.type !== 'token_transfer') {
    return TxSummaryTitleCellRenderer(tx);
  }
  return (
    <Flex alignItems="center">
      {TxSummaryTitleCellRenderer(tx)}
      <V3StxPrice
        value={Number(tx.token_transfer.amount)}
        bitcoinBlockTime={tx.bitcoin_block.time}
      />
    </Flex>
  );
}

const rightAlignedHeader =
  (label: string) =>
  ({ header }: { header: Header<PrincipalTxTableData, unknown> }) => (
    <Flex alignItems="center" justifyContent="flex-end" w="full">
      <DefaultTableColumnHeader header={header}>{label}</DefaultTableColumnHeader>
    </Flex>
  );

export const principalTxsColumns: ColumnDef<PrincipalTxTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => <TransactionTitleCell tx={info.getValue() as TransactionSummary} />,
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxType,
    header: 'Type',
    accessorKey: TxTableColumns.TxType,
    cell: info => <TxTypeCellRenderer txType={info.getValue() as string} />,
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxId,
    header: 'ID',
    accessorKey: TxTableColumns.TxId,
    cell: info => TxLinkCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
  {
    id: TxTableColumns.From,
    header: 'By',
    accessorKey: TxTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.ArrowRight,
    header: '',
    accessorKey: TxTableColumns.ArrowRight,
    cell: () => IconCellRenderer(<ArrowRight />),
    enableSorting: false,
    size: 45,
    minSize: 45,
    maxSize: 45,
  },
  {
    id: TxTableColumns.To,
    header: 'Target',
    accessorKey: TxTableColumns.To,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.Fee,
    header: rightAlignedHeader('Fee'),
    accessorKey: TxTableColumns.Fee,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {FeeCellRenderer(info.getValue() as string)}
      </Flex>
    ),
    enableSorting: false,
  },
  {
    id: TxTableColumns.BlockTime,
    header: rightAlignedHeader('Timestamp'),
    accessorKey: TxTableColumns.BlockTime,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {TimeStampCellRenderer(
          formatTimestampToRelativeTime(info.getValue() as number),
          formatTimestampLocalized(info.getValue() as number)
        )}
      </Flex>
    ),
    enableSorting: false,
    size: 150,
  },
];

export const mapPrincipalTxRow = (tx: TransactionSummary): PrincipalTxTableData => {
  const to = getV3ToAddress(tx);
  return {
    [TxTableColumns.Transaction]: tx,
    [TxTableColumns.TxType]: tx.type,
    [TxTableColumns.TxId]: tx.tx_id,
    [TxTableColumns.From]: {
      address: tx.sender.address,
      isContract: validateStacksContractId(tx.sender.address),
    },
    [TxTableColumns.ArrowRight]: null,
    [TxTableColumns.To]: {
      address: to,
      isContract: validateStacksContractId(to),
    },
    [TxTableColumns.Fee]: tx.fee_rate,
    [TxTableColumns.BlockTime]: tx.block.time,
  };
};
