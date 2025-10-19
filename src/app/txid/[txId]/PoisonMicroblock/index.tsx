import * as React from 'react';

import {
  MempoolPoisonMicroblockTransaction,
  PoisonMicroblockTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { TxPage } from '../TxPage';
import { TxDetails } from './TxDetails';

export default function PoisonMicroblock({
  tx,
}: {
  tx: PoisonMicroblockTransaction | MempoolPoisonMicroblockTransaction;
}) {
  return <TxPage tx={tx} txDetails={<TxDetails tx={tx} />} />;
}
