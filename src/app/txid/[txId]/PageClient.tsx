'use client';

import { TxTableFiltersProvider } from '@/common/components/table/tx-table/useTxTableFilters';

import { useTxIdPageData } from './TxIdPageContext';
import { CoinbasePage as CoinbasePageRedesign } from './redesign/CoinbasePage';
import { ContractCallPage as ContractCallPageRedesign } from './redesign/ContractCallPage';
import { SmartContractPage as SmartContractPageRedesign } from './redesign/SmartContractPage';
import { TenureChangePage as TenureChangePageRedesign } from './redesign/TenureChangePage';
import { TokenTransferPage as TokenTransferPageRedesign } from './redesign/TokenTransferPage';

function TransactionIdPage() {
  const { initialTxData: tx, filters } = useTxIdPageData();

  let txPage = null;

  if (tx?.tx_type === 'smart_contract') txPage = <SmartContractPageRedesign tx={tx} />;

  if (tx?.tx_type === 'token_transfer') txPage = <TokenTransferPageRedesign tx={tx} />;

  if (tx?.tx_type === 'tenure_change') txPage = <TenureChangePageRedesign tx={tx} />;

  if (tx?.tx_type === 'coinbase') txPage = <CoinbasePageRedesign tx={tx} />;

  if (tx?.tx_type === 'contract_call') txPage = <ContractCallPageRedesign tx={tx} />;

  return (
    <TxTableFiltersProvider
      defaultTransactionType={filters.transactionType}
      defaultFromAddress={filters.fromAddress}
      defaultToAddress={filters.toAddress}
      defaultStartTime={filters.startTime}
      defaultEndTime={filters.endTime}
    >
      {txPage}
    </TxTableFiltersProvider>
  );
}

export default TransactionIdPage;
