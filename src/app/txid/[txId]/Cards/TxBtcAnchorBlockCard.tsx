'use client';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { RightBoxSkeleton } from '../../../../common/components/loaders/RightBox';
import { BtcAnchorBlockCardBase } from '../../../_components/BtcAnchorBlockCard';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';
import { useTxBlock } from '../useTxBlock';

interface TxBtcAnchorBlockCardBaseProps {
  tx: Transaction | MempoolTransaction;
}

function TxBtcAnchorBlockCardBase({ tx }: TxBtcAnchorBlockCardBaseProps) {
  const { data: block, isLoading } = useTxBlock(tx);
  if (isLoading) return <RightBoxSkeleton />;
  return <BtcAnchorBlockCardBase block={block} />;
}

export function TxBtcAnchorBlockCard(props: TxBtcAnchorBlockCardBaseProps) {
  return (
    <ExplorerErrorBoundary renderContent={() => null}>
      <TxBtcAnchorBlockCardBase {...props} />
    </ExplorerErrorBoundary>
  );
}
