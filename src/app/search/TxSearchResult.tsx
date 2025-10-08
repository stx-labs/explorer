import { TxsTableWithFilters } from '@/common/components/table/tx-table/TxsTableWithFilters';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { CompressedTxTableData, compressTransactions } from '@/common/utils/transaction-utils';
import { UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

function getTableInitialData(
  response?: UseQueryResult<GenericResponseType<Transaction>>
): GenericResponseType<CompressedTxTableData> | undefined {
  if (!response?.data) return undefined;

  return {
    ...response.data,
    results: compressTransactions(response.data.results),
  };
}

interface TxSearchResultProps {
  response?: UseQueryResult<GenericResponseType<Transaction>>;
  onTotalChange?: (total: number) => void;
}

export function TxSearchResult({ response, onTotalChange }: TxSearchResultProps) {
  const initialData = useMemo(() => getTableInitialData(response), [response]);

  return <TxsTableWithFilters initialData={initialData} onTotalChange={onTotalChange} />;
}
