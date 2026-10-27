import dynamic from 'next/dynamic';
import { FC } from 'react';

import { ExplorerErrorBoundary } from '../../../app/_components/ErrorBoundary';
import { AddressConfirmedTxs } from '../../../app/address/[principal]/tx-lists/AddressConfirmedTxs';
import { Section } from '../../../common/components/Section';
import { SkeletonTxsList } from '../SkeletonTxsList';
import { TxListTabsBase } from './TxListTabsBase';

const AddressMempoolTxsList = dynamic(
  () => import('../AddressMempoolTxsList').then(mod => mod.AddressMempoolTxsList),
  {
    loading: () => <SkeletonTxsList />,
    ssr: false,
  }
);

export const AddressTxListTabs: FC<{
  address: string;
}> = ({ address }) => {
  return (
    <ExplorerErrorBoundary Wrapper={Section} wrapperProps={{ padding: '150px 0' }} tryAgainButton>
      <TxListTabsBase
        confirmedList={<AddressConfirmedTxs principal={address} />}
        mempoolList={<AddressMempoolTxsList address={address} />}
      />
    </ExplorerErrorBoundary>
  );
};
