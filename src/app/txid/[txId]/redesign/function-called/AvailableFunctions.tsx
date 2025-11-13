import { useUser } from '@/app/sandbox/hooks/useUser';
import { SectionTabsContentContainer } from '@/common/components/SectionTabs';
import { Button } from '@/ui/Button';

import { FunctionList } from './FunctionList';

export const AvailableFunctions = ({ contractId }: { contractId: string }) => {
  const { isConnected, connect } = useUser();

  return isConnected ? (
    <FunctionList contractId={contractId} />
  ) : (
    <SectionTabsContentContainer alignItems="center">
      <Button variant="redesignPrimary" onClick={connect} w="fit-content">
        Connect Stacks Wallet
      </Button>
    </SectionTabsContentContainer>
  );
};
