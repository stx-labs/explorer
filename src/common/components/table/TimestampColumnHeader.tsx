import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';
import { Header, Table } from '@tanstack/react-table';

import { TimeStampCellRenderer } from './table-examples/TxTableCellRenderers';

export interface TimestampTableMeta {
  toggleTimestamp?: {
    showAbsolute: boolean;
    toggle: () => void;
  };
}

interface TimestampColumnHeaderProps<TData> {
  header: Header<TData, unknown>;
  table: Table<TData>;
}

export function TimestampColumnHeader<TData>({ header, table }: TimestampColumnHeaderProps<TData>) {
  const meta = table.options.meta as TimestampTableMeta | undefined;
  const toggleState = meta?.toggleTimestamp;
  const showAbsolute = toggleState?.showAbsolute;

  return (
    <Flex
      gap={1.5}
      alignItems="center"
      justifyContent="flex-end"
      w="full"
      cursor="pointer"
      onClick={toggleState?.toggle}
      _hover={{ bg: 'surfaceSecondary' }}
      borderRadius="redesign.md"
      textDecoration="underline"
    >
      <DefaultTableColumnHeader header={header}>
        {showAbsolute ? 'Date Time' : 'Age'}
      </DefaultTableColumnHeader>
      <Tooltip
        content={showAbsolute ? 'Click to show Age format' : 'Click to show Date Time format'}
      >
        <Icon h={4} w={4} color="iconSecondary">
          <Info />
        </Icon>
      </Tooltip>
    </Flex>
  );
}

export function TimestampCell<TData>({
  timestamp,
  table,
}: {
  timestamp: number;
  table: Table<TData>;
}) {
  const meta = table.options.meta as TimestampTableMeta | undefined;
  const showAbsolute = meta?.toggleTimestamp?.showAbsolute;
  const relativeTime = formatTimestampToRelativeTime(timestamp);
  const absoluteTime = formatTimestampLocalized(timestamp);

  return (
    <Flex alignItems="center" justifyContent="flex-end" w="full">
      {TimeStampCellRenderer(
        showAbsolute ? absoluteTime : relativeTime,
        showAbsolute ? relativeTime : absoluteTime
      )}
    </Flex>
  );
}
