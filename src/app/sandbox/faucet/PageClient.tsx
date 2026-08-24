'use client';

import { Box, Field, HStack, Icon, Stack } from '@chakra-ui/react';
import { NextPage } from 'next';
import React from 'react';

import { TxLink } from '../../../common/components/ExplorerLinks';
import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useFaucet } from '../../../common/queries/useFaucet';
import { useSbtcFaucet } from '../../../common/queries/useSbtcFaucet';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Link } from '../../../ui/Link';
import { Text } from '../../../ui/Text';
import StxIcon from '../../../ui/icons/StxIcon';
import { Title } from '../../../ui/typography';
import { useUser } from '../hooks/useUser';
import {
  getDocumentableFaucetApiUrl,
  getFaucetCurlCommand,
  getFaucetErrorMessage,
  getRecipientAddressError,
} from './utils';

const FAUCET_DOCS_URL = 'https://docs.hiro.so/en/apis/stacks-blockchain-api/reference/faucets/stx';
const RATE_LIMITS_DOCS_URL = 'https://docs.hiro.so/en/resources/guides/rate-limits';

const CurlExample = ({ command }: { command: string }) => (
  <Box
    as="pre"
    bg="surfaceSecondary"
    borderRadius="redesign.md"
    px={3}
    py={2}
    whiteSpace="pre-wrap"
    wordBreak="break-all"
    fontSize="xs"
    fontFamily="matterMono"
    color="textSecondary"
  >
    {command}
  </Box>
);

const FaucetSuccess = ({ token, txId }: { token: string; txId?: string }) => (
  <HStack gap={4} fontSize={'sm'}>
    <Text aria-hidden="true">💰</Text>
    <Text>
      {token} coming your way shortly! {txId ? <TxLink txId={txId}>View transaction</TxLink> : null}
    </Text>
    <Text aria-hidden="true">💰</Text>
  </HStack>
);

const Faucet: NextPage = () => {
  const { stxAddress } = useUser();
  const { url: apiUrl } = useGlobalContext().activeNetwork;
  const [address, setAddress] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  const [stackingIndex, setIndex] = React.useState(0);
  const lastPrefilled = React.useRef('');
  const stxFaucet = useFaucet();
  const sbtcFaucet = useSbtcFaucet();

  React.useEffect(() => {
    if (!stxAddress) return;
    setAddress(current => {
      if (current && current !== lastPrefilled.current) return current;
      lastPrefilled.current = stxAddress;
      return stxAddress;
    });
  }, [stxAddress]);

  const addressError = getRecipientAddressError(address.trim());
  const errorMessage =
    getFaucetErrorMessage(stxFaucet.error) || getFaucetErrorMessage(sbtcFaucet.error);
  const documentableApiUrl = getDocumentableFaucetApiUrl(apiUrl);

  const startRequest = () => {
    setShowValidation(true);
    if (addressError) return false;
    stxFaucet.reset();
    sbtcFaucet.reset();
    return true;
  };

  const requestStx = (stacking?: boolean) => {
    if (!startRequest()) return false;
    stxFaucet.mutate({ address: address.trim(), stacking });
    return true;
  };

  const requestSbtc = () => {
    if (!startRequest()) return;
    sbtcFaucet.mutate({ address: address.trim() });
  };

  const handleStackingRequest = () => {
    if (stackingIndex > 3) return;
    if (stackingIndex === 3 && !requestStx(true)) return;
    setIndex(i => i + 1);
  };
  const getStackingLabel = () => {
    switch (stackingIndex) {
      case 4:
        return 'Okay, STX requested!';
      case 3:
        return 'Confirm: request stacking STX for this address?';
      case 2:
        return 'This address can only do this once every 2 days.';
      case 1:
        return 'Are you sure?';
      default:
        return 'I want to stack';
    }
  };
  return (
    <Stack alignItems={'center'} mt={46} gap={6} pb={10}>
      <Icon h={10} w={10}>
        <StxIcon />
      </Icon>
      <Title as="h2">Testnet Faucet</Title>
      <Text fontSize={'sm'}>Need STX or sBTC to test the network? The faucet can top you up!</Text>
      <Stack gap={2} aria-live="polite" alignItems="center" minHeight={6}>
        {!!errorMessage ? <Text color={'textError'}>{errorMessage}</Text> : null}
        {stxFaucet.isSuccess ? <FaucetSuccess token="STX" txId={stxFaucet.data?.txId} /> : null}
        {sbtcFaucet.isSuccess ? <FaucetSuccess token="sBTC" txId={sbtcFaucet.data?.txId} /> : null}
      </Stack>
      <Stack gap={4} width="full" maxWidth="440px">
        <Field.Root invalid={showValidation && !!addressError}>
          <Stack gap={1} width="full">
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onBlur={() => setShowValidation(true)}
              placeholder="Enter a testnet Stacks address"
              aria-label="Recipient Stacks address"
            />
            <Field.ErrorText color={'textError'} textStyle="text-medium-xs">
              {addressError}
            </Field.ErrorText>
          </Stack>
        </Field.Root>
        <HStack
          gap={3}
          justifyContent="center"
          flexDirection={{ base: 'column', md: 'row' }}
          width="full"
        >
          <Button
            variant={'primary'}
            minW="9.5rem"
            loading={stxFaucet.isPending}
            loadingText="Requesting STX"
            onClick={() => requestStx()}
          >
            Request STX
          </Button>
          <Button
            variant={'secondary'}
            minW="9.5rem"
            loading={sbtcFaucet.isPending}
            loadingText="Requesting sBTC"
            onClick={requestSbtc}
          >
            Request sBTC
          </Button>
        </HStack>
        <Button
          size={'xs'}
          fontSize={'xs'}
          variant={'secondary'}
          disabled={stxFaucet.isPending}
          onClick={() => handleStackingRequest()}
        >
          {getStackingLabel()}
        </Button>
      </Stack>
      {documentableApiUrl ? (
        <Stack gap={2} width="full" maxWidth="440px" pt={4}>
          <Text fontSize={'sm'}>
            Both faucets are also available as an API, no authentication required.
          </Text>
          <CurlExample command={getFaucetCurlCommand(documentableApiUrl, 'stx')} />
          <CurlExample command={getFaucetCurlCommand(documentableApiUrl, 'sbtc')} />
          <HStack gap={4}>
            <Link href={FAUCET_DOCS_URL} target="_blank" rel="noopener noreferrer" fontSize={'xs'}>
              Faucet API documentation
            </Link>
            <Link
              href={RATE_LIMITS_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              fontSize={'xs'}
            >
              Rate limits
            </Link>
          </HStack>
        </Stack>
      ) : null}
    </Stack>
  );
};

export default Faucet;
