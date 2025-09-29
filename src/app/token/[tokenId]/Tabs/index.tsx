import { getIsSBTC } from '@/app/tokens/utils';

import { ContractAvailableFunctions } from '../../../../common/components/ContractAvailableFunctions';
import { TabsContainer } from '../../../../common/components/TabsContainer';
import {
  useContractById,
  useSuspenseContractById,
} from '../../../../common/queries/useContractById';
import { AddressConfirmedTxsList } from '../../../../features/txs-list/AddressConfirmedTxsList';
import { AddressMempoolTxsList } from '../../../../features/txs-list/AddressMempoolTxsList';
import { CodeEditor } from '../../../../ui/CodeEditor';
import { TabsRootProps } from '../../../../ui/Tabs';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';
import { sbtcDepositAddress, sbtcWidthdrawlContractAddress } from '../consts';
import { DeveloperData, TokenInfoProps } from '../types';
import { Developers } from './Developers';
import HoldersTable from './holders/Holders';

interface TokenTabsProps extends Partial<TabsRootProps> {
  tokenId: string;
  tokenInfo: TokenInfoProps;
  developerData?: DeveloperData;
}

export function TokenTabsBase({ tokenId, tokenInfo, developerData }: TokenTabsProps) {
  const { data: contract } = useSuspenseContractById(tokenId);
  const source = contract?.source_code;
  const isSBTC = getIsSBTC(tokenId);
  const { data: sbtcWithdrawalContract } = useContractById(
    isSBTC ? sbtcWidthdrawlContractAddress : undefined
  );

  return (
    <TabsContainer
      tabs={[
        {
          title: 'Confirmed',
          id: 'confirmed',
          content: <AddressConfirmedTxsList address={tokenId} />,
        },
        {
          title: 'Pending',
          id: 'pending',
          content: <AddressMempoolTxsList address={tokenId} />,
        },
        ...(isSBTC
          ? [
              {
                title: 'Confirmed Deposits',
                id: 'confirmed-deposits',
                content: <AddressConfirmedTxsList address={sbtcDepositAddress} />,
              },
            ]
          : []),
        ...(isSBTC
          ? [
              {
                title: 'Pending Deposits',
                id: 'pending-deposits',
                content: <AddressMempoolTxsList address={sbtcDepositAddress} />,
              },
            ]
          : []),
        ...(isSBTC && sbtcWithdrawalContract
          ? [
              {
                title: 'Withdraw Deposits',
                id: 'withdraw-deposits',
                content: (
                  <ContractAvailableFunctions
                    contractId={sbtcWidthdrawlContractAddress}
                    contract={sbtcWithdrawalContract}
                  />
                ),
              },
            ]
          : []),
        ...(!!source
          ? [
              {
                title: 'Source code',
                id: 'source',
                content: <CodeEditor code={source} height={500} />,
              },
            ]
          : []),
        ...(!!contract
          ? [
              {
                title: 'Available functions',
                id: 'available-functions',
                content: <ContractAvailableFunctions contractId={tokenId} contract={contract} />,
              },
            ]
          : []),
        ...(!!developerData
          ? [
              {
                title: 'Developers',
                id: 'developers',
                content: <Developers developerData={developerData} />,
              },
            ]
          : []),

        {
          title: 'Holders',
          id: 'holders',
          content: <HoldersTable tokenId={tokenId} tokenInfo={tokenInfo} />,
        },
      ]}
      actions={null}
      gridColumnEnd={'3'}
    />
  );
}

export function instaTokenTabs(props: TokenTabsProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <TokenTabsBase {...props} />
    </ExplorerErrorBoundary>
  );
}
