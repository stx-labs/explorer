import { Box, Flex, Grid, Icon, Spinner, Stack } from '@chakra-ui/react';
import { Atom } from '@phosphor-icons/react';
import { FC, memo, useId, useState } from 'react';

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
}> = memo(function DataVariableRow({ contractId, variable }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const labelId = useId();
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
      <Box
        as="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(prev => !prev)}
        display="flex"
        width="full"
        justifyContent="space-between"
        alignItems="center"
        p={4}
        bg="transparent"
        border="none"
        textAlign="left"
        cursor="pointer"
        _hover={{ bg: 'surfaceHighlight' }}
      >
        <Flex alignItems="center" minW={0}>
          <Grid
            placeItems="center"
            borderWidth="1px"
            borderRadius="100%"
            h={8}
            w={8}
            flexShrink={0}
            aria-hidden="true"
          >
            <Icon h={4} w={4}>
              <Atom />
            </Icon>
          </Grid>
          <Box ml={4} minW={0}>
            <Text id={labelId} fontSize="sm" fontFamily="matterMono" fontWeight="500">
              {variable.name}
            </Text>
            <Text fontSize="xs" color="textSubdued" truncate>
              {typeLabel}
            </Text>
          </Box>
        </Flex>
        <Text fontSize="xs" color="textSubdued" ml={4}>
          {isLoading ? 'Loading…' : expanded ? 'Hide' : 'Fetch value'}
        </Text>
      </Box>
      {expanded && (
        <Box id={panelId} role="region" aria-labelledby={labelId} px={4} pb={4}>
          {isLoading && (
            <Flex alignItems="center" justifyContent="center" py={4}>
              <Spinner size="sm" />
            </Flex>
          )}
          {error && (
            <Text color="textError" fontSize="sm">
              {error instanceof Error ? error.message : 'Failed to fetch data variable value'}
            </Text>
          )}
          {data && <CodeEditor code={parseHexClarityValue(data.data).display} />}
        </Box>
      )}
    </Box>
  );
});

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
