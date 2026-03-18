'use client';

import { ExplorerErrorBoundary } from '../../../app/_components/ErrorBoundary';
import { useFtMetadata } from '../../queries/useFtMetadata';
import { ftDecimals } from '../../utils/utils';

interface FtTokenAmountBaseProps {
  amount: string;
  contractId: string;
  decimals?: number;
}
export function FtTokenAmountBase({ amount, contractId, decimals }: FtTokenAmountBaseProps) {
  const { data: tokenMetadata } = useFtMetadata(decimals !== undefined ? undefined : contractId);
  const resolvedDecimals = decimals ?? tokenMetadata?.decimals ?? 0;
  return <>{ftDecimals(amount, resolvedDecimals)}</>;
}

export function FtTokenAmount(props: FtTokenAmountBaseProps) {
  return (
    <ExplorerErrorBoundary>
      <FtTokenAmountBase {...props} />
    </ExplorerErrorBoundary>
  );
}

export function NftTokenAmount({ amount }: { amount: string }) {
  return <>{parseInt(amount).toLocaleString()}</>;
}
