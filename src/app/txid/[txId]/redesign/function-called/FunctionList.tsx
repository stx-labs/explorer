import { useContractById } from '@/common/queries/useContractById';
import { Stack } from '@chakra-ui/react';
import { useState } from 'react';

import { ClarityAbiFunction } from '@stacks/transactions';

import { TabsContentContainer } from '../TxTabs';
import { FunctionCallForm } from './FunctionCallForm';
import { FunctionListItem } from './FunctionListItem';

export function FunctionList({ contractId }: { contractId: string }) {
  const { data: contract } = useContractById(contractId);
  const functions = contract?.abi?.functions as unknown as ClarityAbiFunction[];

  const [selectedFunction, setSelectedFunction] = useState<ClarityAbiFunction | null>(null);

  const filteredFunctions = selectedFunction
    ? functions.filter(fn => fn.name === selectedFunction.name)
    : functions;

  if (!functions) return null;

  return (
    <Stack gap={2}>
      <TabsContentContainer>
        <Stack gap={4}>
          {filteredFunctions.map(fn => (
            <FunctionListItem
              key={fn.name}
              functionAbi={fn}
              isOpen={!!selectedFunction}
              setIsOpen={open => {
                if (!open) {
                  setSelectedFunction(null);
                } else {
                  setSelectedFunction(fn);
                }
              }}
              containerProps={{
                className: 'group',
                py: 2,
                px: 3,
                borderRadius: 'redesign.md',
                _hover: {
                  bg: 'surfacePrimary',
                },
              }}
            />
          ))}
        </Stack>
      </TabsContentContainer>
      {selectedFunction && (
        <TabsContentContainer>
          <FunctionCallForm
            contractId={contractId}
            fnAbi={selectedFunction}
            handleCancel={() => setSelectedFunction(null)}
          />
        </TabsContentContainer>
      )}
    </Stack>
  );
}
