import { TxsTable, defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { CompressedTxTableData } from '@/common/utils/transaction-utils';

import { useTxTableFilters } from './useTxTableFilters';

export function TxsTableWithFilters({
  initialData,
  onTotalChange,
}: {
  initialData: GenericResponseType<CompressedTxTableData> | undefined;
  onTotalChange?: (total: number) => void;
}) {
  const { fromAddress, toAddress, startTime, endTime, transactionType } = useTxTableFilters();
  return (
    <TxsTable
      initialData={initialData}
      filters={{ fromAddress, toAddress, startTime, endTime, transactionType }}
      onTotalChange={onTotalChange}
      tableContainer={defaultTableContainer}
    />
  );
}
