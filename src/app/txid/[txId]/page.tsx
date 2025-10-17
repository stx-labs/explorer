import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { validateStacksContractId } from '@/common/utils/utils';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import TransactionIdPage from './PageClient';
import { TxIdPageDataProvider } from './TxIdPageContext';
import { fetchContractById, fetchTxById } from './page-data';

export interface TxIdPageSearchParams extends CommonSearchParams {
  startTime?: string;
  endTime?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string;
}

export interface TxIdPageFilters {
  startTime?: string;
  endTime?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string[];
}

export default async function Page(props: {
  params: Promise<{ txId: string }>;
  searchParams: Promise<TxIdPageSearchParams>;
}) {
  const params = await props.params;
  const { txId } = params;
  const searchParams = await props.searchParams;
  const { startTime, endTime, chain, api, fromAddress, toAddress, transactionType } = searchParams;
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialTxData: Transaction | MempoolTransaction | undefined;

  const isContractId = validateStacksContractId(txId);

  try {
    tokenPrice = await getTokenPrice();
    if (isContractId) {
      const contractData = await fetchContractById(apiUrl, txId); // fetch contract data for tx_id
      initialTxData = await fetchTxById(apiUrl, contractData.tx_id);
    } else {
      initialTxData = await fetchTxById(apiUrl, txId);
    }
  } catch (error) {
    logError(
      error as Error,
      'Transaction Id page server-side fetch for initial data',
      { txId, tokenPrice, initialTxData, chain, api },
      'error'
    );
  }

  return (
    <TxIdPageDataProvider
      stxPrice={tokenPrice.stxPrice}
      initialTxData={initialTxData}
      txId={txId}
      filters={{
        fromAddress: fromAddress || '',
        toAddress: toAddress || '',
        startTime: startTime || '',
        endTime: endTime || '',
        transactionType: transactionType ? transactionType.split(',') : [],
      }}
    >
      <TransactionIdPage />
    </TxIdPageDataProvider>
  );
}
