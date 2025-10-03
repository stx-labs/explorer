import { useUser } from '@/app/sandbox/hooks/useUser';
import { useContractById } from '@/common/queries/useContractById';
import { isConfirmedTx } from '@/common/utils/transactions';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Grid, Stack } from '@chakra-ui/react';
import { useState } from 'react';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
} from '@stacks/stacks-blockchain-api-types';
import { ClarityAbiFunction, cvToJSON, hexToCV } from '@stacks/transactions';

import { TabsContentContainer } from '../TxTabs';
import { FunctionArgsTable } from './FunctionArgsTable';
import { FunctionCallForm } from './FunctionCallForm';
import { FunctionListItem } from './FunctionListItem';
import { FunctionResultNonTuple } from './FunctionResultNonTuple';
import { FunctionResultStatus } from './FunctionResultStatus';
import { FunctionResultsTable } from './FunctionResultTable';
import { FunctionResultType } from './FunctionResultType';
import { getContractCallTxFunctionArgs } from './utils';

function FunctionTitle({
  fnAbi,
  setIsFunctionCallOpen,
  isFunctionCallOpen,
}: {
  fnAbi: ClarityAbiFunction;
  setIsFunctionCallOpen: (open: boolean) => void;
  isFunctionCallOpen: boolean;
}) {
  return (
    <TabsContentContainer>
      <FunctionListItem
        functionAbi={fnAbi}
        isOpen={isFunctionCallOpen}
        setIsOpen={setIsFunctionCallOpen}
      />
    </TabsContentContainer>
  );
}

function FunctionResult({ tx }: { tx: ContractCallTransaction | MempoolContractCallTransaction }) {
  if (!isConfirmedTx(tx) || !tx.tx_result) return null;
  const result = tx.tx_result;
  const { success, type, value } = cvToJSON(hexToCV(result.hex));
  const hasType = !type?.includes('UnknownType');

  return (
    <TabsContentContainer px={6}>
      <Grid
        templateColumns={{ base: 'minmax(0, 1fr)', md: '80px minmax(0, 1fr)' }}
        gap={3}
        columnGap={12}
        alignItems="center"
      >
        {type?.includes('tuple') ? (
          <>
            <Box pt={5}>
              <Text textStyle="text-medium-sm" color="textSecondary">
                Result
              </Text>
            </Box>
            <Stack alignItems="flex-start">
              <FunctionResultType tx={tx} />
              <FunctionResultsTable tx={tx} />
            </Stack>
          </>
        ) : (
          <>
            <Flex h="full" alignItems="center">
              <Text textStyle="text-medium-sm" color="textSecondary">
                Result
              </Text>
            </Flex>
            <Flex alignItems="center" gap={2}>
              <FunctionResultStatus tx={tx} />
              <FunctionResultNonTuple tx={tx} />
            </Flex>
          </>
        )}
      </Grid>
    </TabsContentContainer>
  );
}

function FunctionArgs({ tx }: { tx: ContractCallTransaction | MempoolContractCallTransaction }) {
  const args = getContractCallTxFunctionArgs(tx);
  if (!args.length) return null;
  return (
    <TabsContentContainer px={6}>
      <Grid
        templateColumns={{ base: 'minmax(0, 1fr)', md: '80px minmax(0, 1fr)' }}
        gap={3}
        columnGap={12}
      >
        <Box pt={5}>
          <Text textStyle="text-medium-sm" color="textSecondary">
            Arguments
          </Text>
        </Box>
        <FunctionArgsTable tx={tx} />
      </Grid>
    </TabsContentContainer>
  );
}

export const FunctionCalled = ({
  tx,
}: {
  tx: ContractCallTransaction | MempoolContractCallTransaction;
}) => {
  const [isFunctionCallOpen, setIsFunctionCallOpen] = useState(false);
  const contractCallName = tx.contract_call?.function_name;
  const contractId = tx.contract_call?.contract_id;
  const { data: contract } = useContractById(contractId);
  const functionAbi = contract?.abi?.functions?.find(
    fn => fn.name === contractCallName
  ) as unknown as ClarityAbiFunction;
  const { isConnected, connect } = useUser();

  if (!contract) return null;

  return (
    <Stack gap={2}>
      <FunctionTitle
        fnAbi={functionAbi}
        setIsFunctionCallOpen={setIsFunctionCallOpen}
        isFunctionCallOpen={isFunctionCallOpen}
      />
      {isFunctionCallOpen ? (
        isConnected ? (
          <TabsContentContainer>
            <FunctionCallForm
              contractId={contractId}
              fnAbi={functionAbi}
              handleCancel={() => setIsFunctionCallOpen(false)}
            />
          </TabsContentContainer>
        ) : (
          <TabsContentContainer alignItems="center">
            <Button variant="redesignPrimary" onClick={connect} w="fit-content">
              Connect Stacks Wallet
            </Button>
          </TabsContentContainer>
        )
      ) : (
        <>
          <FunctionResult tx={tx} />
          <FunctionArgs tx={tx} />
        </>
      )}
    </Stack>
  );
};
