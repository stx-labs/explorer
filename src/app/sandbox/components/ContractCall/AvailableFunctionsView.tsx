import { Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { FC, forwardRef } from 'react';

import { Badge } from '../../../../common/components/Badge';
import { ExplorerLink } from '../../../../common/components/ExplorerLinks';
import { Section } from '../../../../common/components/Section';
import { ContractWithParsedAbi } from '../../../../common/types/contract';
import { showFn } from '../../../../common/utils/sandbox';
import { Text } from '../../../../ui/Text';
import FunctionReadOnlyIcon from '../../../../ui/icons/FunctionReadOnly';
import FunctionXIcon from '../../../../ui/icons/FunctionX';

export const AbiFunction = forwardRef<
  HTMLDivElement,
  {
    abiFn: { access: string; name: string };
    onClick?: () => void;
  }
>(({ abiFn, onClick }, ref) => {
  return (
    <Flex
      ref={ref}
      justifyContent="space-between"
      p={4}
      _hover={{
        cursor: 'pointer',
        bg: `surfaceHighlight`,
      }}
      onClick={onClick}
      w="full"
      alignItems="center"
    >
      <Flex alignItems="center">
        <Flex alignItems="center">
          <Grid placeItems="center" borderWidth="1px" borderRadius="100%" h={8} w={8}>
            {abiFn.access === 'read_only' ? (
              <Icon h={5} w={5}>
                <FunctionReadOnlyIcon />
              </Icon>
            ) : (
              <Icon h={4} w={4}>
                <FunctionXIcon />
              </Icon>
            )}
          </Grid>
          <Text fontSize="sm" fontFamily={`"Fira Code", monospace`} ml={4} fontWeight="500">
            {abiFn.name}
          </Text>
        </Flex>
        {abiFn.access === 'read_only' && (
          <Badge ml={4} bg={`surface`} color={`text`}>
            {abiFn.access}
          </Badge>
        )}
      </Flex>
      <Icon h={4} w={4}>
        <ArrowRight />
      </Icon>
    </Flex>
  );
});

export const AvailableFunctionsView: FC<{
  contract: ContractWithParsedAbi;
  contractId: string;
}> = ({ contractId, contract }) => (
  <Section title="Available functions" overflowY="auto" flexGrow={1}>
    <Stack>
      {contract?.abi?.functions.map(
        (abiFn: any) =>
          showFn(contractId, abiFn) && (
            <ExplorerLink
              href={`/sandbox/contract-call/${contractId}/${abiFn.name}`}
              key={abiFn.name}
            >
              <AbiFunction abiFn={abiFn} />
            </ExplorerLink>
          )
      )}
    </Stack>
  </Section>
);
