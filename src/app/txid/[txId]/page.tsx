import { fetchContractInfo, fetchTx } from '@/api/data-fetchers';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import { isFailedContractCall, parseContractAbi } from '@/common/tx-diagnosis';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { canServerFetch, getApiUrl } from '@/common/utils/network-utils';
import { validateStacksContractId } from '@/common/utils/utils';

import {
  ContractInterfaceResponse,
  MempoolTransaction,
  SmartContract,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import TransactionIdPage from './PageClient';
import { TxIdPageDataProvider } from './TxIdPageContext';
import { asInitialContractData } from './txid-page-utils';

export interface TxIdPageSearchParams extends CommonSearchParams {
  startTime?: string;
  endTime?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string;
  ssr?: string;
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
  const { startTime, endTime, chain, api, fromAddress, toAddress, transactionType, ssr } =
    searchParams;
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialTxData: Transaction | MempoolTransaction | undefined;
  let initialContractData: SmartContract | undefined;
  let numFunctions: number | undefined;

  const isContractId = validateStacksContractId(txId);
  // Custom API hosts come from the visitor: never fetched from the server, rendered client-side.
  const isSSRDisabled = ssr === 'false' || !canServerFetch(apiUrl);

  if (!isSSRDisabled) {
    try {
      tokenPrice = await getTokenPrice();
      if (isContractId) {
        const contractData = await fetchContractInfo(apiUrl, txId); // fetch contract data for tx_id
        const abi = parseContractAbi(contractData?.abi) as ContractInterfaceResponse | undefined;
        numFunctions = abi?.functions?.length;
        initialTxData = await fetchTx(apiUrl, contractData.tx_id);
      } else {
        initialTxData = await fetchTx(apiUrl, txId);
      }
      // Failed contract calls: the "Why it failed" card needs the called contract's source for
      // its first paint, so fetch it here (one extra request, only on failed contract-call pages).
      if (isFailedContractCall(initialTxData)) {
        try {
          initialContractData = asInitialContractData(
            await fetchContractInfo(apiUrl, initialTxData.contract_call.contract_id)
          );
        } catch (contractError) {
          logError(
            contractError as Error,
            'Transaction Id page server-side fetch for called contract',
            { txId, chain, api },
            'warning'
          );
        }
      }
    } catch (error) {
      logError(
        error as Error,
        'Transaction Id page server-side fetch for initial data',
        { txId, tokenPrice, initialTxData, chain, api },
        'error'
      );
    }
  }

  return (
    <TxIdPageDataProvider
      stxPrice={tokenPrice.stxPrice}
      initialTxData={initialTxData}
      initialContractData={initialContractData}
      txId={txId}
      numFunctions={numFunctions}
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
