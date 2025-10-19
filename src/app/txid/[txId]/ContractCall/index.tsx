import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { ContractSource } from '../../../../common/components/contract-source';
import { getTransactionStatus } from '../../../../common/utils/transactions';
import { getTxContractId } from '../../../../common/utils/utils';
import { PostConditions } from '../PostConditions';
import { TxPage } from '../TxPage';
import { FunctionSummary } from './FunctionSummary';
import { TxDetails } from './TxDetails';

export default function ContractCallPage({
  tx,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
}) {
  const txContractId = getTxContractId(tx);
  const txStatus = getTransactionStatus(tx);
  const result = 'tx_result' in tx ? tx.tx_result : undefined;

  return (
    <TxPage tx={tx} contractId={txContractId} txDetails={<TxDetails tx={tx} />}>
      <FunctionSummary result={result} summary={tx.contract_call} btc={null} txStatus={txStatus} />
      <PostConditions tx={tx} />
      <ContractSource txContractId={txContractId} />
    </TxPage>
  );
}
