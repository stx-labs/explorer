'use client';

import { FC } from 'react';
import * as React from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';

export const Nonce: FC<{ tx: Transaction | MempoolTransaction }> = ({ tx }) => (
  <KeyValueHorizontal
    label={'Nonce'}
    value={<Value>{tx.nonce}</Value>}
    copyValue={tx.nonce.toString()}
  />
);
