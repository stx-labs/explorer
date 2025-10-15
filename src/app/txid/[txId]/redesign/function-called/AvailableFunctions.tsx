import { useUser } from '@/app/sandbox/hooks/useUser';
import { Button } from '@/ui/Button';

import { TabsContentContainer } from '../TxTabs';
import { FunctionList } from './FunctionList';

export const AvailableFunctions = ({ contractId }: { contractId: string }) => {
  const { isConnected, connect } = useUser();

  return isConnected ? (
    <FunctionList contractId={contractId} />
  ) : (
    <TabsContentContainer alignItems="center">
      <Button variant="redesignPrimary" onClick={connect} w="fit-content">
        Connect Stacks Wallet
      </Button>
    </TabsContentContainer>
  );
};
