'use client';

import { useIsRedesignUrl } from '@/common/utils/url-utils';
import { Grid, GridProps, Stack } from '@chakra-ui/react';

import { useSuspenseAccountBalance } from '../../../common/queries/useAccountBalance';
import { useAddressNonces } from '../../../common/queries/useAddressNonces';
import { hasTokenBalance } from '../../../common/utils/accounts';
import { AddressTxListTabs } from '../../../features/txs-list/tabs/AddressTxListTabs';
import { PageTitle } from '../../_components/PageTitle';
import { AddressSummary } from './AddressSummary';
import RedesignPageClient from './RedesignPageClient';
import { StxBalance } from './StxBalance';
import { TokenBalanceCard } from './TokenBalanceCard';

export function AddressPageLayout(props: GridProps) {
  return (
    <Grid
      gridColumnGap={8}
      gridTemplateColumns={['100%', '100%', 'repeat(1, calc(100% - 352px) 320px)']}
      gridRowGap={[8, 8, 'unset']}
      maxWidth="100%"
      alignItems="flex-start"
      {...props}
    />
  );
}

export default function AddressPage({ principal }: { principal: string }) {
  const { data: balance } = useSuspenseAccountBalance(principal);
  const { data: nonces } = useAddressNonces({ address: principal });

  const hasTokenBalances = hasTokenBalance(balance);

  const isRedesign = useIsRedesignUrl();

  if (isRedesign) {
    return <RedesignPageClient principal={principal} />;
  }

  return (
    <>
      <PageTitle>Address details</PageTitle>
      <AddressPageLayout>
        <Stack gap={8}>
          <AddressSummary
            principal={principal}
            hasTokenBalances={hasTokenBalances}
            balances={balance}
            lastExecutedTxNonce={nonces?.last_executed_tx_nonce}
          />
          <AddressTxListTabs address={principal} />
        </Stack>
        <Stack gap={8}>
          <StxBalance address={principal} />
          <TokenBalanceCard address={principal} />
        </Stack>
      </AddressPageLayout>
    </>
  );
}
