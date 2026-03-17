import { Box, Flex, Spinner } from '@chakra-ui/react';
import { FC, ReactNode } from 'react';

import { ClarityAbiFunction, ClarityValue } from '@stacks/transactions';

import { Section } from '../../../../common/components/Section';
import { useGlobalContext } from '../../../../common/context/useGlobalContext';
import { useCallReadOnlyFunction } from '../../../../common/queries/useCallReadOnlyFunction';
import { CodeEditor } from '../../../../ui/CodeEditor';
import { Text } from '../../../../ui/Text';
import { useUser } from '../../hooks/useUser';
import { parseReadOnlyResponse } from '../../utils';

interface ReadOnlyProps {
  readOnlyValue: ClarityValue[];
  contractId: string;
  fn: ClarityAbiFunction;
  cancelButton: ReactNode;
}

export const ReadOnlyField: FC<ReadOnlyProps> = ({
  readOnlyValue,
  contractId,
  fn,
  cancelButton,
}) => {
  const { stxAddress } = useUser();
  const network = useGlobalContext().activeNetwork;

  const { data, error, isLoading } = useCallReadOnlyFunction({
    contractId,
    fn,
    readOnlyValue,
    stacksNetwork: network,
    stxAddress,
  });

  if (isLoading) {
    return (
      <Box p={4}>
        <Flex alignItems="center" justifyContent="center" py={4}>
          <Spinner size="sm" />
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Text color="red" fontSize="sm">
          {error.message || 'Failed to call read-only function'}
        </Text>
        <Flex alignItems="center" justifyContent="center" pt={4}>
          {cancelButton}
        </Flex>
      </Box>
    );
  }

  if (!data) return null;

  let resultContent;
  if (data.okay) {
    resultContent = (
      <Section title="Response">
        <CodeEditor code={parseReadOnlyResponse(data)} />
      </Section>
    );
  } else {
    let errorMessage = data.result;
    try {
      errorMessage = parseReadOnlyResponse(data);
    } catch {
      // Fall back to raw result if parsing fails
    }
    resultContent = (
      <Section title="Error">
        <CodeEditor code={errorMessage} />
      </Section>
    );
  }

  return (
    <Box p={4}>
      {resultContent}
      <Flex alignItems="center" justifyContent="center" pt={4}>
        {cancelButton}
      </Flex>
    </Box>
  );
};
