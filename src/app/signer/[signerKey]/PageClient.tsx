'use client';

import { Grid, Stack, useBreakpointValue } from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

import { logError } from '../../../common/utils/error-utils';
import { PageTitle } from '../../_components/PageTitle';
import { AssociatedAddressesTable } from './AssociatedAddressesTable';
import { SignerStats } from './SignerStats';
import { SignerSummary } from './SignerSummary';
import { StackingHistoryTable } from './StackingHistoryTable';

export function SignerKeyPageLayout({
  signerSummary,
  associatedAddressesTable,
  stackingHistoryTable,
  signerStats,
}: {
  signerSummary: ReactNode;
  associatedAddressesTable: ReactNode;
  stackingHistoryTable: ReactNode;
  signerStats: ReactNode;
}) {
  const isSmallScreen = useBreakpointValue({ base: true, lg: false });

  return isSmallScreen ? (
    <Stack maxWidth="100%" gap={8}>
      {signerSummary}
      {signerStats}
      {associatedAddressesTable}
      {stackingHistoryTable}
    </Stack>
  ) : (
    <Grid
      gridColumnGap={8}
      gridTemplateColumns={'repeat(1, calc(100% - 352px) 320px)'}
      gridRowGap={8}
      maxWidth="100%"
      alignItems="flex-start"
    >
      <Stack gap={8}>
        {signerSummary}
        {associatedAddressesTable}
        {stackingHistoryTable}
      </Stack>
      <Stack gap={8}>{signerStats}</Stack>
    </Grid>
  );
}

export default function PageClient() {
  const params = useParams<{ signerKey: string }>();

  if (!params) {
    logError(
      new Error('signer page: params is undefined'),
      'signer-page-no-params',
      undefined,
      'warning'
    );
    return null;
  }

  const { signerKey } = params;
  return (
    <>
      <PageTitle>Signer key</PageTitle>

      <SignerKeyPageLayout
        signerSummary={<SignerSummary signerKey={signerKey} />}
        associatedAddressesTable={<AssociatedAddressesTable signerKey={signerKey} />}
        stackingHistoryTable={<StackingHistoryTable signerKey={signerKey} />}
        signerStats={<SignerStats signerKey={signerKey} />}
      />
    </>
  );
}
