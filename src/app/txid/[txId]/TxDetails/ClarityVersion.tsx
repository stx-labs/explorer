import { FC } from 'react';
import * as React from 'react';

import {
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';

export const ClarityVersion: FC<{
  tx: SmartContractTransaction | MempoolSmartContractTransaction;
}> = ({ tx }) => {
  const clarityVersion = tx.smart_contract?.clarity_version || 1;
  return (
    <KeyValueHorizontal
      label={'Clarity version'}
      value={<Value>{clarityVersion}</Value>}
      copyValue={clarityVersion.toString()}
    />
  );
};
