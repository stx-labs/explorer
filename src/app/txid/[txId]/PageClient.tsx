'use client';

import { TxTableFiltersProvider } from '@/common/components/table/tx-table/useTxTableFilters';
import { useIsRedesignUrl } from '@/common/utils/url-utils';
import dynamic from 'next/dynamic';

import { useTxIdPageData } from './TxIdPageContext';
import { CoinbasePage as CoinbasePageRedesign } from './redesign/CoinbasePage';
import { ContractCallPage as ContractCallPageRedesign } from './redesign/ContractCallPage';
import { SmartContractPage as SmartContractPageRedesign } from './redesign/SmartContractPage';
import { TenureChangePage as TenureChangePageRedesign } from './redesign/TenureChangePage';
import { TokenTransferPage as TokenTransferPageRedesign } from './redesign/TokenTransferPage';
import Skeleton from './skeleton';

const ContractCallPage = dynamic(() => import('./ContractCall'), {
  loading: () => <Skeleton />,
  ssr: false,
});

const SmartContractTx = dynamic(() => import('./SmartContract/SmartContractTx'), {
  loading: () => <Skeleton />,
  ssr: false,
});

const SmartContract = dynamic(() => import('./SmartContract/SmartContract'), {
  loading: () => <Skeleton />,
  ssr: false,
});

const PoisonMicroblock = dynamic(() => import('./PoisonMicroblock'), {
  loading: () => <Skeleton />,
  ssr: false,
});

function TransactionIdPage() {
  const { initialTxData: tx, txId, filters } = useTxIdPageData();
  const isRedesign = useIsRedesignUrl();

  const isContractId = txId.includes('.');
  if (isContractId) {
    return <SmartContract contractId={txId} />;
  }

  let txPage = null;

  if (tx?.tx_type === 'smart_contract') txPage = <SmartContractTx tx={tx} />;
  if (tx?.tx_type === 'smart_contract') txPage = <SmartContractPageRedesign tx={tx} />;

  if (tx?.tx_type === 'token_transfer') txPage = <TokenTransferPageRedesign tx={tx} />;

  if (tx?.tx_type === 'tenure_change') txPage = <TenureChangePageRedesign tx={tx} />;

  if (tx?.tx_type === 'coinbase') txPage = <CoinbasePageRedesign tx={tx} />;

  if (tx?.tx_type === 'contract_call' && isRedesign) return <ContractCallPageRedesign tx={tx} />;
  if (tx?.tx_type === 'contract_call') return <ContractCallPage tx={tx} />;

  if (tx?.tx_type === 'poison_microblock') txPage = <PoisonMicroblock tx={tx} />;

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
