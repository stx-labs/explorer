import { Flex, Stack } from '@chakra-ui/react';
import { FC } from 'react';

import { Text } from '../../../ui/Text';
import { Title } from '../../../ui/typography';

export const WalletUnsupportedNetwork: FC = () => (
  <Flex
    flexGrow={1}
    alignItems="center"
    justifyContent="flex-start"
    pt="120px"
    flexDirection="column"
    maxWidth="300px"
    mx="auto"
  >
    <Stack gap={8} textAlign="center" color="text">
      <Title fontSize={'20px'}>Wallet transactions are unavailable on this network</Title>
      <Text fontSize="sm">
        Stacks wallets can only sign for Stacks Mainnet, Stacks Testnet (Primary) and a local
        devnet. Switch to one of those networks to use the sandbox.
      </Text>
    </Stack>
  </Flex>
);
