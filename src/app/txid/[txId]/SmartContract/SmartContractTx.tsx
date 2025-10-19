import {
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { useContractById } from '../../../../common/queries/useContractById';
import { getTxContractId } from '../../../../common/utils/utils';
import { AddressTxListTabs } from '../../../../features/txs-list/tabs/AddressTxListTabs';
import { PostConditions } from '../PostConditions';
import { TxPage } from '../TxPage';
import { ContractTabs } from './ContractTabs';
import { TxDetails } from './TxDetails';

export default function SmartContractTx({
  tx,
}: {
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
}) {
  const txContractId = getTxContractId(tx);
  const { data: contract } = useContractById(txContractId);
  const source = contract?.source_code;

  return (
    <TxPage tx={tx} contractId={txContractId} txDetails={<TxDetails tx={tx} />}>
      <PostConditions tx={tx} />
      {!!txContractId && (
        <>
          <ContractTabs source={source} contract={contract} contractId={txContractId} />
          <AddressTxListTabs address={txContractId} />
        </>
      )}
    </TxPage>
  );
}
