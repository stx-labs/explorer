import { useMemo } from 'react';

import { TransactionSummary } from '../../../common/types/tx-v3';
import {
  AllTransactionsFilteredMessage,
  NoTransactionsMessage,
} from '../../txsFilterAndSort/TransactionMessages';
import { useFilterAndSortState } from '../../txsFilterAndSort/useFilterAndSortState';
import { TxSummaryListItem } from './TxSummaryListItem';

export const FilteredTxSummaries = ({ txs }: { txs: TransactionSummary[] }) => {
  const { activeFilters } = useFilterAndSortState();
  const filteredTxs = useMemo(
    () => (activeFilters.length === 0 ? txs : txs?.filter(tx => activeFilters.includes(tx.type))),
    [txs, activeFilters]
  );

  const hasTxs = !!txs?.length;
  const hasVisibleTxs = !!filteredTxs?.length;
  if (hasTxs && !hasVisibleTxs) return <AllTransactionsFilteredMessage />;
  if (hasVisibleTxs)
    return (
      <>
        {filteredTxs.map(tx => (
          <TxSummaryListItem tx={tx} key={`tx-summary-list-item-${tx.tx_id}`} />
        ))}
      </>
    );
  return <NoTransactionsMessage />;
};
