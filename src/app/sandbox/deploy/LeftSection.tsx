'use client';

import { Box, Button, Flex, Icon, Stack } from '@chakra-ui/react';
import { Toolbox, X } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useRandomName } from '../../../common/hooks/useRandomName';
import { useAppDispatch, useAppSelector } from '../../../common/state/hooks';
import { InputGroup } from '../../../components/ui/input-group';
import { IconButton } from '../../../ui/IconButton';
import { Input } from '../../../ui/Input';
import { Text } from '../../../ui/Text';
import { TextLink } from '../../../ui/TextLink';
import { Tooltip } from '../../../ui/Tooltip';
import { Caption, Title } from '../../../ui/typography';
import { selectCodeBody, toggleCodeToolbar } from '../sandbox-slice';
import { deployContract } from '../utils/walletTransactions';

export function LeftSection() {
  const dispatch = useAppDispatch();
  const randomName = useRandomName();
  const network = useGlobalContext().activeNetwork;
  const [contractName, setContractName] = useState(randomName());
  const codeBody = useAppSelector(selectCodeBody);
  const queryClient = useQueryClient();

  const onDeploy = useCallback(async () => {
    await deployContract({
      name: contractName,
      clarityCode: codeBody,
      network: network.mode,
    });
    void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite'] });
  }, [codeBody, contractName, network, queryClient]);
  return (
    <>
      <Title mb="32px" fontSize="24px">
        Write & Deploy
      </Title>
      <Caption mb="8px">Contract name</Caption>
      <Stack gap={3}>
        <Stack gap={5}>
          <Flex>
            <InputGroup
              border="1px solid transparent"
              alignItems="center"
              borderRadius="xl"
              position="relative"
              w="full"
              endElement={
                <IconButton
                  onClick={() => {
                    setContractName('');
                  }}
                  aria-label={'clear contract name field'}
                >
                  <Icon h={4} w={4} color="icon">
                    <X />
                  </Icon>
                </IconButton>
              }
            >
              <Input
                value={contractName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setContractName(e.target?.value)
                }
                placeholder="Name your contract"
                pr={21}
                w="full"
              />
            </InputGroup>
            <Box onClick={() => dispatch(toggleCodeToolbar())}>
              <Tooltip content="Contract tools">
                <IconButton aria-label={'contract tools'} size={10}>
                  <Icon h={4} w={4} color="icon">
                    <Toolbox />
                  </Icon>
                </IconButton>
              </Tooltip>
            </Box>
          </Flex>
          <Stack alignItems="center" justifyContent={'center'} gap={2}>
            <Button
              onClick={async () => {
                await onDeploy();
              }}
              width="100%"
              variant={'primary'}
            >
              Deploy
            </Button>
          </Stack>
        </Stack>
        <Stack gap={2}>
          <Text fontSize="xs" as="p">
            The sandbox only supports Clarity 3 deployments. To deploy using a different version,
            please use{' '}
            <TextLink
              display="inline"
              href="https://docs.stacks.co/clarinet/contract-deployment"
              target="_blank"
              _hover={{ textDecoration: 'underline' }}
            >
              Clarinet
            </TextLink>{' '}
            or the{' '}
            <TextLink
              display="inline"
              href="https://platform.hiro.so/"
              target="_blank"
              _hover={{ textDecoration: 'underline' }}
            >
              Hiro platform
            </TextLink>{' '}
            instead.
          </Text>
        </Stack>
      </Stack>
    </>
  );
}
