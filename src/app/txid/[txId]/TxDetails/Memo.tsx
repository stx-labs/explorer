import { FC } from 'react';
import * as React from 'react';

import {
  MempoolTokenTransferTransaction,
  TokenTransferTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';
import { getMemoString } from '../../../../common/utils/utils';

export const Memo: FC<{ tx: TokenTransferTransaction | MempoolTokenTransferTransaction }> = ({
  tx,
}) => {
  const memo = getMemoString(tx.token_transfer.memo);
  if (!memo) return null;
  return <KeyValueHorizontal label={'Memo'} value={<Value>{memo}</Value>} copyValue={memo} />;
};
