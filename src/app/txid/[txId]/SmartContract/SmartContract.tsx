import * as React from 'react';

import { useContractById } from '../../../../common/queries/useContractById';
import { useTxById } from '../../../../common/queries/useTxById';
import { AddressTxListTabs } from '../../../../features/txs-list/tabs/AddressTxListTabs';
import { PostConditions } from '../PostConditions';
import { TxPage } from '../TxPage';
import { ContractTabs } from './ContractTabs';
import { TxDetails } from './TxDetails';

export default function SmartContract({ contractId }: { contractId: string }) {
  const { data: contract } = useContractById(contractId);
  const { data: tx } = useTxById(contract?.tx_id);
  const source = contract?.source_code;

  if (tx?.tx_type !== 'smart_contract') return null;

  return (
    <TxPage tx={tx} contractId={contractId} txDetails={<TxDetails tx={tx} />}>
      <PostConditions tx={tx} />
      <ContractTabs source={source} contract={contract} contractId={contractId} />
      <AddressTxListTabs address={contractId} />
    </TxPage>
  );
}
