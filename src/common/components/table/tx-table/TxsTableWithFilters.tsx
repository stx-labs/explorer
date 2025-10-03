import { CompressedTxTableData } from '@/app/transactions/utils';
import { TxsTable } from '@/common/components/table/table-examples/TxsTable';
import { defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';

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
