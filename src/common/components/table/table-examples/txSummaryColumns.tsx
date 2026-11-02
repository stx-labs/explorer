import {
  AddressLinkCellRenderer,
  FeeCellRenderer,
} from '@/common/components/table/CommonTableCellRenderers';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import {
  MempoolTransactionSummary,
  PrincipalTransactionSummary,
  TransactionSummary,
} from '@/common/types/tx-v3';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { getV3ToAddress } from '@/features/txs-list/utils';
import { Text } from '@/ui/Text';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { ColumnDef, Header } from '@tanstack/react-table';

import { BlockLink } from '../../ExplorerLinks';
import {
  EventsCellRenderer,
  IconCellRenderer,
  MempoolTxSummaryTitleCellRenderer,
  TimeStampCellRenderer,
  TxLinkCellRenderer,
  TxSummaryTitleCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TxTableColumns } from './types';

/** Whether a principal's STX balance went up (`in`) or down beyond the fee it paid (`out`). */
export type TxDirection = 'in' | 'out';

/**
 * One row of any v3 transaction summary table (feeds, block, address/contract/token tabs, mempool).
 * Columns read straight from the summary; `direction` is only set on principal tables.
 */
export interface TxSummaryTableRow {
  tx: TransactionSummary | MempoolTransactionSummary;
  direction?: TxDirection;
}

type TxSummaryColumn = ColumnDef<TxSummaryTableRow>;

const isConfirmedSummary = (
  tx: TransactionSummary | MempoolTransactionSummary
): tx is TransactionSummary => 'block' in tx;

const ZERO = BigInt(0);

/**
 * Infers a principal's direction for a transaction from its v3 `balance_changes`: `in` when its STX
 * balance grew, `out` when it sent STX beyond the fee it paid, otherwise none (e.g. a contract call
 * that only cost the fee).
 */
export function getTxDirection(item: PrincipalTransactionSummary): TxDirection | undefined {
  const { sent, net } = item.balance_changes.stx;
  if (BigInt(net) > ZERO) return 'in';
  const { transaction: tx, involvement } = item;
  const paidFee = involvement === 'sponsor' || (involvement === 'sender' && !tx.sponsor);
  const sentBeyondFee = BigInt(sent) - (paidFee ? BigInt(tx.fee_rate) : ZERO);
  return sentBeyondFee > ZERO ? 'out' : undefined;
}

export const toTxSummaryRow = (
  tx: TransactionSummary | MempoolTransactionSummary,
  direction?: TxDirection
): TxSummaryTableRow => ({ tx, direction });

export const toPrincipalTxSummaryRow = (item: PrincipalTransactionSummary): TxSummaryTableRow =>
  toTxSummaryRow(item.transaction, getTxDirection(item));

const rightAligned = (content: React.ReactNode) => (
  <Flex alignItems="center" justifyContent="flex-end" w="full">
    {content}
  </Flex>
);

const rightAlignedHeader =
  (label: string) =>
  ({ header }: { header: Header<TxSummaryTableRow, unknown> }) =>
    rightAligned(<DefaultTableColumnHeader header={header}>{label}</DefaultTableColumnHeader>);

function TransactionTitleCell({ tx, direction }: TxSummaryTableRow) {
  const title = isConfirmedSummary(tx)
    ? TxSummaryTitleCellRenderer(tx)
    : MempoolTxSummaryTitleCellRenderer(tx);
  if (!direction) return title;
  return (
    <Flex alignItems="center" gap={1}>
      <Icon
        h={3}
        w={3}
        color="iconPrimary"
        aria-label={direction === 'in' ? 'Received' : 'Sent'}
        role="img"
      >
        {direction === 'in' ? <ArrowDownRight /> : <ArrowUpRight />}
      </Icon>
      {title}
    </Flex>
  );
}

const transactionColumn: TxSummaryColumn = {
  id: TxTableColumns.Transaction,
  header: 'Transaction',
  accessorFn: row => row.tx,
  cell: info => <TransactionTitleCell {...info.row.original} />,
  enableSorting: false,
};

const txTypeColumn: TxSummaryColumn = {
  id: TxTableColumns.TxType,
  header: 'Type',
  accessorFn: row => row.tx.type,
  cell: info => <TxTypeCellRenderer txType={info.getValue() as string} />,
  enableSorting: false,
};

const txIdColumn: TxSummaryColumn = {
  id: TxTableColumns.TxId,
  header: 'ID',
  accessorFn: row => row.tx.tx_id,
  cell: info => TxLinkCellRenderer(info.getValue() as string),
  enableSorting: false,
};

const addressCell = (address: string) =>
  AddressLinkCellRenderer({ address, isContract: validateStacksContractId(address) });

const fromColumn: TxSummaryColumn = {
  id: TxTableColumns.From,
  header: 'By',
  accessorFn: row => row.tx.sender.address,
  cell: info => addressCell(info.getValue() as string),
  enableSorting: false,
};

const arrowColumn: TxSummaryColumn = {
  id: TxTableColumns.ArrowRight,
  header: '',
  cell: () => IconCellRenderer(<ArrowRight />),
  enableSorting: false,
  size: 45,
  minSize: 45,
  maxSize: 45,
};

const toColumn: TxSummaryColumn = {
  id: TxTableColumns.To,
  header: 'Target',
  accessorFn: row => getV3ToAddress(row.tx),
  cell: info => addressCell(info.getValue() as string),
  enableSorting: false,
};

const nonceColumn: TxSummaryColumn = {
  id: TxTableColumns.Nonce,
  header: rightAlignedHeader('Nonce'),
  accessorFn: row => row.tx.sender.nonce,
  cell: info =>
    rightAligned(
      <Text textStyle="text-regular-sm" fontFamily="var(--font-matter-mono)">
        {info.getValue() as number}
      </Text>
    ),
  enableSorting: false,
};

const blockColumn: TxSummaryColumn = {
  id: TxTableColumns.BlockHeight,
  header: rightAlignedHeader('Block'),
  accessorFn: row => (isConfirmedSummary(row.tx) ? row.tx.block : undefined),
  cell: info => {
    const block = info.getValue() as TransactionSummary['block'] | undefined;
    if (!block) return null;
    return rightAligned(
      <BlockLink hash={block.hash} variant="tableLink">
        <Text textStyle="text-regular-sm" fontFamily="var(--font-matter-mono)">
          #{block.height}
        </Text>
      </BlockLink>
    );
  },
  enableSorting: false,
};

const feeColumn: TxSummaryColumn = {
  id: TxTableColumns.Fee,
  header: rightAlignedHeader('Fee'),
  accessorFn: row => row.tx.fee_rate,
  cell: info => rightAligned(FeeCellRenderer(info.getValue() as string)),
  enableSorting: false,
};

const timestampColumn = (label: string): TxSummaryColumn => ({
  id: TxTableColumns.BlockTime,
  header: rightAlignedHeader(label),
  accessorFn: row => (isConfirmedSummary(row.tx) ? row.tx.block.time : row.tx.receipt_time),
  cell: info => {
    const time = info.getValue() as number;
    return rightAligned(
      TimeStampCellRenderer(formatTimestampToRelativeTime(time), formatTimestampLocalized(time))
    );
  },
  enableSorting: false,
  size: 150,
});

const eventsColumn: TxSummaryColumn = {
  id: TxTableColumns.Events,
  header: rightAlignedHeader('Events'),
  accessorFn: row => row.tx,
  cell: info => rightAligned(EventsCellRenderer(info.getValue() as TransactionSummary)),
  enableSorting: false,
};

const leadingColumns = [
  transactionColumn,
  txTypeColumn,
  txIdColumn,
  fromColumn,
  arrowColumn,
  toColumn,
  nonceColumn,
];

/** Confirmed transactions: the /transactions feed and the address/contract/token tabs. */
export const confirmedTxSummaryColumns: TxSummaryColumn[] = [
  ...leadingColumns,
  blockColumn,
  feeColumn,
  timestampColumn('Timestamp'),
];

/** {@link confirmedTxSummaryColumns} plus the summary's `event_count`, for the token Transactions tab. */
export const confirmedTxSummaryColumnsWithEvents: TxSummaryColumn[] = [
  ...confirmedTxSummaryColumns,
  eventsColumn,
];

/** A single block's transactions: every row shares the block, so its height column is dropped. */
export const blockTxSummaryColumns: TxSummaryColumn[] = confirmedTxSummaryColumns.filter(
  column => column.id !== TxTableColumns.BlockHeight
);

/** Pending transactions: the /mempool feed and the address Pending tab. */
export const mempoolTxSummaryColumns: TxSummaryColumn[] = [
  ...leadingColumns,
  feeColumn,
  timestampColumn('Received'),
];
