import FungibleTokenIcon from '@/ui/icons/FungibleTokenIcon';
import { Box, Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { ArrowSquareOut, Atom, ListChecks } from '@phosphor-icons/react';
import { FC } from 'react';

import { ClarityAbiFunction } from '@stacks/transactions';

import { TxLink } from '../../../../common/components/ExplorerLinks';
import { Section } from '../../../../common/components/Section';
import { TxIcon } from '../../../../common/components/TxIcon';
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { useAppSelector } from '../../../../common/state/hooks';
import { ContractWithParsedAbi } from '../../../../common/types/contract';
import { buildUrl } from '../../../../common/utils/buildUrl';
import { truncateMiddleDeprecated } from '../../../../common/utils/utils';
import { NextLink } from '../../../../ui/NextLink';
import FunctionXIcon from '../../../../ui/icons/FunctionX';
import { Caption, Title } from '../../../../ui/typography';
import { selectShowRightPanel } from '../../sandbox-slice';
import { AvailableFunctionsView } from './AvailableFunctionsView';
import { DataVariablesView } from './DataVariablesView';
import { FunctionView } from './FunctionView';
import { PluralizedCaption } from './PluralizedCaption';

interface ContractInfoProps {
  contract: ContractWithParsedAbi;
}

const ContractInfo: FC<ContractInfoProps> = ({ contract: { contract_id, abi } }) => {
  return (
    <Section
      topRight={
        <TxLink txId={contract_id} target="_blank">
          <Flex alignItems="center">
            <Caption transform="translateY(1px)" color="currentColor">
              Go to transaction
            </Caption>
            <Icon ml={2} color="currentColor" h={4} w={4}>
              <ArrowSquareOut />
            </Icon>
          </Flex>
        </TxLink>
      }
      flexShrink={0}
      mb={8}
      title="Contract details"
    >
      <Box>
        <Flex p={4} justifyContent="space-between" alignItems="center">
          <Flex alignItems="center">
            <TxIcon h={16} w={16} />
            <Box ml={4}>
              <Title mb={2} display="block" mt="0" as="h3">
                {contract_id.split('.')[1]}
              </Title>
              <Caption display="block">
                {' '}
                {truncateMiddleDeprecated(contract_id.split('.')[0], 8)}
              </Caption>
            </Box>
          </Flex>
        </Flex>
        <Stack p={4}>
          <Flex alignItems="center">
            <Box opacity={0.6} h={5} w={5}>
              <Icon h={5} w={5}>
                <FunctionXIcon />
              </Icon>
            </Box>
            <PluralizedCaption ml={2} array={abi?.functions} label="function" />
          </Flex>
          <Flex alignItems="center">
            <Box opacity={0.6} h={5} w={5}>
              <Icon h={5} w={5}>
                <Atom />
              </Icon>
            </Box>
            <PluralizedCaption ml={2} array={abi?.variables} label="variable" />
          </Flex>
          <Flex alignItems="center">
            <Box opacity={0.6} h={5} w={5}>
              <Icon h={5} w={5}>
                <ListChecks />
              </Icon>
            </Box>
            <PluralizedCaption ml={2} array={abi?.maps} label="map" />
          </Flex>
          <Flex alignItems="center">
            <Box opacity={0.6} h={5} w={5}>
              <Icon h={5} w={5}>
                <FungibleTokenIcon />
              </Icon>
            </Box>
            <PluralizedCaption
              ml={2}
              array={[...(abi?.fungible_tokens || []), ...(abi?.non_fungible_tokens || [])]}
              label="token"
            />
          </Flex>
        </Stack>
      </Box>
    </Section>
  );
};

export const SelectedContractView: FC<{
  contract: ContractWithParsedAbi;
  functionName?: string;
  contractId: string;
}> = ({ contract, functionName, contractId }) => {
  const network = useGlobalContext().activeNetwork;
  const showRightPanel = useAppSelector(selectShowRightPanel);
  const activeNetwork = useGlobalContext().activeNetwork;

  return (
    <Grid
      width={showRightPanel ? 'calc((1142px / 3) * 2)' : '100%'}
      gridTemplateColumns={showRightPanel ? '1fr 1fr' : '1fr 2fr'}
      flexGrow={1}
      flexShrink={1}
    >
      <Box borderRightWidth="1px" p={4}>
        <ContractInfo contract={contract} />
      </Box>
      <Box overflow="auto" maxHeight="calc(100vh - 217px)" p={4}>
        {functionName ? (
          <FunctionView
            contractId={contractId}
            fn={
              contract?.abi?.functions?.find(
                (fn: any) => fn.name === functionName
              ) as unknown as ClarityAbiFunction
            }
            cancelButton={
              <NextLink href={buildUrl(`/sandbox/contract-call/${contractId}`, activeNetwork)}>
                <Caption _hover={{ cursor: 'pointer', color: 'textTitle' }} mt={4}>
                  Back to functions
                </Caption>
              </NextLink>
            }
          />
        ) : (
          <>
            <AvailableFunctionsView contract={contract} contractId={contractId} />
            <DataVariablesView contract={contract} contractId={contractId} />
          </>
        )}
      </Box>
    </Grid>
  );
};
