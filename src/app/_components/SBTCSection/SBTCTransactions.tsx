'use client';

import { AddressLink, TxLink } from '@/common/components/ExplorerLinks';
import { EllipsisText } from '@/common/components/table/CommonTableCellRenderers';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { TimeStampCellRenderer } from '@/common/components/table/table-examples/TxTableCellRenderers';
import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { truncateHex, truncateStxAddress } from '@/common/utils/utils';
import { Badge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import SBTCIcon from '@/ui/icons/sBTCIcon';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';

import { SBTCTransaction } from './types';

enum SBTCTxColumns {
  Type = 'type',
  TxId = 'txId',
  Address = 'address',
  Amount = 'amount',
  Timestamp = 'timestamp',
}

interface SBTCTxRowData {
  [SBTCTxColumns.Type]: 'deposit' | 'withdrawal';
  [SBTCTxColumns.TxId]: string;
  [SBTCTxColumns.Address]: string;
  [SBTCTxColumns.Amount]: { amount: number; amountUsd: number };
  [SBTCTxColumns.Timestamp]: number;
}

const columnDefinitions: ColumnDef<SBTCTxRowData>[] = [
  {
    id: SBTCTxColumns.Type,
    header: 'Type',
    accessorKey: SBTCTxColumns.Type,
    cell: info => {
      const type = info.getValue() as 'deposit' | 'withdrawal';
      const isDeposit = type === 'deposit';
      return (
        <Badge variant="outline" content="iconAndLabel" type="transactionType">
          <Flex alignItems="center" gap={1.5}>
            <DefaultBadgeIcon
              icon={isDeposit ? <ArrowDown weight="bold" /> : <ArrowUp weight="bold" />}
              bg={isDeposit ? 'feedback.green-500' : 'feedback.red-500'}
            />
            <DefaultBadgeLabel label={isDeposit ? 'Deposit' : 'Withdrawal'} />
          </Flex>
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    id: SBTCTxColumns.TxId,
    header: 'ID',
    accessorKey: SBTCTxColumns.TxId,
    cell: info => {
      const txId = info.getValue() as string;
      return (
        <TxLink txId={txId} variant="tableLink">
          <EllipsisText textStyle="text-regular-xs" fontFamily="var(--font-matter-mono)">
            {truncateHex(txId, 4, 5, false)}
          </EllipsisText>
        </TxLink>
      );
    },
    enableSorting: false,
  },
  {
    id: SBTCTxColumns.Address,
    header: 'From',
    accessorKey: SBTCTxColumns.Address,
    cell: info => {
      const address = info.getValue() as string;
      return (
        <AddressLink principal={address} variant="tableLink">
          <EllipsisText fontSize="sm">{truncateStxAddress(address)}</EllipsisText>
        </AddressLink>
      );
    },
    enableSorting: false,
  },
  {
    id: SBTCTxColumns.Amount,
    header: 'Amount',
    accessorKey: SBTCTxColumns.Amount,
    cell: info => {
      const { amount, amountUsd } = info.getValue() as { amount: number; amountUsd: number };
      return (
        <Stack gap={0} alignItems="flex-end">
          <Flex alignItems="center" gap={1}>
            <Icon w={3.5} h={3.5} color="accent.bitcoin-500">
              <SBTCIcon />
            </Icon>
            <Text textStyle="text-medium-xs" color="textPrimary">
              {formatNumber(amount, 0, 6)} sBTC
            </Text>
          </Flex>
          <Text textStyle="text-regular-xs" color="textSecondary" pl={4.5}>
            {formatUsdValue(amountUsd, 0, 0)}
          </Text>
        </Stack>
      );
    },
    meta: { textAlign: 'right' },
    enableSorting: false,
  },
  {
    id: SBTCTxColumns.Timestamp,
    header: 'Timestamp',
    accessorKey: SBTCTxColumns.Timestamp,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {TimeStampCellRenderer(formatTimestampToRelativeTime(info.getValue() as number))}
      </Flex>
    ),
    meta: { textAlign: 'right' },
    enableSorting: false,
  },
];

function toRowData(transactions: SBTCTransaction[]): SBTCTxRowData[] {
  return transactions.map(tx => ({
    [SBTCTxColumns.Type]: tx.type,
    [SBTCTxColumns.TxId]: tx.txId,
    [SBTCTxColumns.Address]: tx.address,
    [SBTCTxColumns.Amount]: { amount: tx.amount, amountUsd: tx.amountUsd },
    [SBTCTxColumns.Timestamp]: tx.blockTime,
  }));
}

export function SBTCTransactions({ transactions }: { transactions: SBTCTransaction[] }) {
  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs" color="textPrimary">
        Recent sBTC transactions
      </Text>
      <Table
        data={toRowData(transactions)}
        columns={columnDefinitions}
        tableContainerWrapper={table => <TableContainer>{table}</TableContainer>}
      />
    </Stack>
  );
}
