import { Tabs } from '@chakra-ui/react';
import { FC } from 'react';

import { ContractAvailableFunctions } from '../../../../common/components/ContractAvailableFunctions';
import { ContractWithParsedAbi } from '../../../../common/types/contract';
import { CodeEditor } from '../../../../ui/CodeEditor';

export const ContractTabs: FC<{
  contractId: string;
  source?: string;
  contract?: ContractWithParsedAbi;
}> = ({ contractId, source, contract }) => {
  if (!contract) return null;

  return (
    <Tabs.Root lazyMount defaultValue={source ? 'source' : 'available-functions'}>
      <Tabs.List>
        {source && <Tabs.Trigger value="source">Source code</Tabs.Trigger>}
        <Tabs.Trigger value="available-functions">Available functions</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="source">
        <CodeEditor code={source || ''} />
      </Tabs.Content>
      <Tabs.Content value="available-functions">
        <ContractAvailableFunctions contractId={contractId} contract={contract} />
      </Tabs.Content>
    </Tabs.Root>
  );
  return null;
};
