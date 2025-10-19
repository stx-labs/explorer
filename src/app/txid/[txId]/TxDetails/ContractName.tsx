'use client';

import { FC } from 'react';
import * as React from 'react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { TxLink } from '../../../../common/components/ExplorerLinks';
import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';

export const ContractName: FC<{
  tx:
    | ContractCallTransaction
    | MempoolContractCallTransaction
    | SmartContractTransaction
    | MempoolSmartContractTransaction;
}> = ({ tx }) => {
  if (tx.tx_type === 'contract_call') {
    return (
      <KeyValueHorizontal
        label={'Contract'}
        value={
          <TxLink txId={tx.contract_call.contract_id}>
            <Value>{tx.contract_call.contract_id}</Value>
          </TxLink>
        }
        copyValue={tx.contract_call.contract_id}
      />
    );
  }
  if (tx.tx_type === 'smart_contract') {
    return (
      <KeyValueHorizontal
        label={'Contract'}
        value={
          <TxLink txId={tx.smart_contract.contract_id}>
            <Value>{tx.smart_contract.contract_id}</Value>
          </TxLink>
        }
        copyValue={tx.smart_contract.contract_id}
      />
    );
  }
  return null;
};
