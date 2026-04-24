'use client';

import { Box, Flex, Grid, Icon, Spinner, Stack } from '@chakra-ui/react';
import { Atom } from '@phosphor-icons/react';
import { FC, useState } from 'react';

import { ClarityAbiType, getTypeString } from '@stacks/transactions';

import { Section } from '../../../../common/components/Section';
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { useDataVarValue } from '../../../../common/queries/useDataVarValue';
import { ContractWithParsedAbi } from '../../../../common/types/contract';
import { CodeEditor } from '../../../../ui/CodeEditor';
import { Text } from '../../../../ui/Text';
import { parseHexClarityValue } from '../../utils';

interface AbiVariable {
  name: string;
  type: ClarityAbiType;
  access: 'variable' | 'constant';
}

const DataVariableRow: FC<{
  contractId: string;
  variable: AbiVariable;
}> = ({ contractId, variable }) => {
  const [expanded, setExpanded] = useState(false);
  const network = useGlobalContext().activeNetwork;

  const { data, error, isLoading } = useDataVarValue({
    contractId,
    varName: variable.name,
    network,
    enabled: expanded,
  });

  const typeLabel = getTypeString(variable.type);

  return (
    <Box>
      <Flex
        justifyContent="space-between"
        p={4}
        _hover={{ cursor: 'pointer', bg: 'surfaceHighlight' }}
        onClick={() => setExpanded(prev => !prev)}
        w="full"
        alignItems="center"
      >
        <Flex alignItems="center" minW={0}>
          <Grid
            placeItems="center"
            borderWidth="1px"
            borderRadius="100%"
            h={8}
            w={8}
            flexShrink={0}
          >
            <Icon h={4} w={4}>
              <Atom />
            </Icon>
          </Grid>
          <Box ml={4} minW={0}>
            <Text fontSize="sm" fontFamily={`"Fira Code", monospace`} fontWeight="500">
              {variable.name}
            </Text>
            <Text fontSize="xs" color="textSubdued" truncate>
              {typeLabel}
            </Text>
          </Box>
        </Flex>
        <Text fontSize="xs" color="textSubdued" ml={4}>
          {expanded ? 'Hide' : 'Fetch value'}
        </Text>
      </Flex>
      {expanded && (
        <Box px={4} pb={4}>
          {isLoading && (
            <Flex alignItems="center" justifyContent="center" py={4}>
              <Spinner size="sm" />
            </Flex>
          )}
          {error && (
            <Text color="red" fontSize="sm">
              {error instanceof Error ? error.message : 'Failed to fetch data variable value'}
            </Text>
          )}
          {data && <CodeEditor code={safeParse(data.data)} />}
        </Box>
      )}
    </Box>
  );
};

const safeParse = (hex: string): string => {
  try {
    return parseHexClarityValue(hex);
  } catch {
    return hex;
  }
};

export const DataVariablesView: FC<{
  contract: ContractWithParsedAbi;
  contractId: string;
}> = ({ contract, contractId }) => {
  const variables = (contract?.abi?.variables ?? []) as unknown as AbiVariable[];
  const dataVars = variables.filter(v => v.access === 'variable');

  if (dataVars.length === 0) return null;

  return (
    <Section title="Data variables" overflowY="auto" mt={4}>
      <Stack>
        {dataVars.map(variable => (
          <DataVariableRow key={variable.name} contractId={contractId} variable={variable} />
        ))}
      </Stack>
    </Section>
  );
};
