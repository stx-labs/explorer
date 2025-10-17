import { Stack } from '@chakra-ui/react';
import { ReactNode, Suspense } from 'react';

import { ExplorerErrorBoundary } from '../../../app/_components/ErrorBoundary';
import { KeyValueHorizontal } from '../../../common/components/KeyValueHorizontal';
import { Section } from '../../../common/components/Section';
import { Value } from '../../../common/components/Value';
import { microToStacksFormatted } from '../../../common/utils/utils';
import { useSuspenseCurrentStackingCycle } from '../../_components/Stats/CurrentStackingCycle/useCurrentStackingCycle';
import { getEntityName } from '../../signers/SignersTable';
import { useSuspensePoxSigner } from '../../signers/data/UseSigner';
import { SignerSummarySkeleton } from './skeleton';

interface SignerSummaryProps {
  signerKey: string;
}

export const SignerSummaryLayout = ({ children }: { children: ReactNode }) => {
  return (
    <Section title="Summary">
      <Stack width="100%">{children}</Stack>
    </Section>
  );
};

export const SignerSummaryBase = ({ signerKey }: SignerSummaryProps) => {
  const { currentCycleId } = useSuspenseCurrentStackingCycle();
  const { data: signerData } = useSuspensePoxSigner(currentCycleId, signerKey);
  const numAssociatedAddresses =
    signerData?.solo_stacker_count != null && signerData?.pooled_stacker_count != null
      ? signerData.solo_stacker_count + signerData.pooled_stacker_count
      : '';

  return (
    <Section title="Summary">
      <Stack width="100%">
        <KeyValueHorizontal
          label={'Key'}
          value={<Value>{signerData?.signing_key}</Value>}
          copyValue={signerData?.signing_key}
        />
        <KeyValueHorizontal
          label={'Entity'}
          value={<Value>{getEntityName(signerData?.signing_key)}</Value>}
          copyValue={getEntityName(signerData?.signing_key)}
        />
        <KeyValueHorizontal
          label={'Voting Power'}
          value={<Value>{signerData?.weight_percent?.toFixed(2) ?? ''}%</Value>}
          copyValue={signerData?.weight_percent?.toFixed(2) ?? ''}
        />
        <KeyValueHorizontal
          label={'STX Stacked'}
          value={<Value>{microToStacksFormatted(signerData?.stacked_amount ?? '')}</Value>}
          copyValue={microToStacksFormatted(signerData?.stacked_amount ?? '')}
        />
        <KeyValueHorizontal
          label={'Associated Addresses'}
          value={<Value>{numAssociatedAddresses}</Value>}
          copyValue={numAssociatedAddresses?.toString()}
        />
      </Stack>
    </Section>
  );
};

export const SignerSummary = ({ signerKey }: SignerSummaryProps) => {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{
        title: 'Signer Summary',
        gridColumnStart: ['1', '1', '2'],
        gridColumnEnd: ['2', '2', '3'],
        minWidth: 0,
      }}
      tryAgainButton
    >
      <Suspense fallback={<SignerSummarySkeleton />}>
        <SignerSummaryBase signerKey={signerKey} />
      </Suspense>
    </ExplorerErrorBoundary>
  );
};
