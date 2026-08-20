'use client';

import { Box, HStack, Icon, Stack } from '@chakra-ui/react';
import { NextPage } from 'next';
import React from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useFaucet } from '../../../common/queries/useFaucet';
import { useSbtcFaucet } from '../../../common/queries/useSbtcFaucet';
import { NetworkModes } from '../../../common/types/network';
import { isAddressForNetworkMode, validateStacksAddress } from '../../../common/utils/utils';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Link } from '../../../ui/Link';
import { Text } from '../../../ui/Text';
import StxIcon from '../../../ui/icons/StxIcon';
import { Title } from '../../../ui/typography';
import { useUser } from '../hooks/useUser';

const FAUCET_DOCS_URL =
  'https://docs.hiro.so/en/apis/stacks-blockchain-api/reference/faucets/run-faucet-stx';

function getErrorMessage(error: any) {
  if (!error) return '';
  const defaultErrorMessage = 'Something went wrong, please try again later.';
  if (!!error?.message) {
    return error.message;
  }
  if (!!error?.status) {
    switch (error.status) {
      case 429:
        return 'Too many requests, please try again later.';
      case 403:
        return 'This faucet is not available right now.';
      default:
        return defaultErrorMessage;
    }
  } else {
    return defaultErrorMessage;
  }
}

export function getRecipientAddressError(address: string, networkMode: NetworkModes) {
  if (!address) return 'Enter a Stacks address.';
  if (!validateStacksAddress(address)) return 'This is not a valid Stacks address.';
  if (!isAddressForNetworkMode(address, networkMode)) {
    return `This is not a ${networkMode} address.`;
  }
  return undefined;
}

export function getFaucetCurlCommand(apiUrl: string, token: 'stx' | 'sbtc') {
  return `curl -X POST "${apiUrl}/extended/v1/faucets/${token}?address=<STX_ADDRESS>"`;
}

const CurlExample = ({ command }: { command: string }) => (
  <Box
    as="pre"
    bg="surfaceSecondary"
    borderRadius="redesign.md"
    px={3}
    py={2}
    overflowX="auto"
    fontSize="xs"
    fontFamily="mono"
    color="textSecondary"
  >
    {command}
  </Box>
);

const Faucet: NextPage = () => {
  const { stxAddress } = useUser();
  const { mode: networkMode, url: apiUrl } = useGlobalContext().activeNetwork;
  const [address, setAddress] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  const [stackingIndex, setIndex] = React.useState(0);
  const {
    mutate: runFaucetStx,
    error: stxError,
    isSuccess: isStxSuccess,
    isPending: isStxPending,
  } = useFaucet();
  const {
    mutate: runFaucetSbtc,
    error: sbtcError,
    isSuccess: isSbtcSuccess,
    isPending: isSbtcPending,
  } = useSbtcFaucet();

  React.useEffect(() => {
    if (!stxAddress) return;
    setAddress(current => current || stxAddress);
  }, [stxAddress]);

  const addressError = getRecipientAddressError(address.trim(), networkMode);
  const errorMessage = getErrorMessage(stxError) || getErrorMessage(sbtcError);

  const requestStx = (stacking?: boolean) => {
    setShowValidation(true);
    if (addressError) return false;
    runFaucetStx({ address: address.trim(), stacking });
    return true;
  };

  const requestSbtc = () => {
    setShowValidation(true);
    if (addressError) return;
    runFaucetSbtc({ address: address.trim() });
  };

  const handleStackingRequest = () => {
    if (stackingIndex > 3) return;
    // Only advance once the request actually goes out, so the confirmation copy can't lie
    if (stackingIndex === 3 && !requestStx(true)) return;
    setIndex(i => i + 1);
  };
  const getStackingLabel = () => {
    switch (stackingIndex) {
      case 4:
        return 'Okay, STX requested!';
      case 3:
        return 'To confirm, you actually want to do this?';
      case 2:
        return 'You can only do this once a day.';
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
      <Title>Testnet Faucet</Title>
      <Text fontSize={'sm'}>Need STX or sBTC to test the network? The faucet can top you up!</Text>
      {!!errorMessage ? <Text color={'error'}>{errorMessage}</Text> : null}
      {isStxSuccess ? (
        <HStack gap={4} fontSize={'sm'}>
          <Text>💰</Text>
          <Text>STX coming your way shortly!</Text>
          <Text>💰</Text>
        </HStack>
      ) : null}
      {isSbtcSuccess ? (
        <HStack gap={4} fontSize={'sm'}>
          <Text>💰</Text>
          <Text>sBTC coming your way shortly!</Text>
          <Text>💰</Text>
        </HStack>
      ) : null}
      <Stack gap={4} width="full" maxWidth="440px">
        <Stack gap={1}>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onBlur={() => setShowValidation(true)}
            placeholder={`Enter a ${networkMode} Stacks address`}
            aria-label="Recipient Stacks address"
            aria-invalid={showValidation && !!addressError}
          />
          {showValidation && addressError ? (
            <Text fontSize={'xs'} color={'error'}>
              {addressError}
            </Text>
          ) : null}
        </Stack>
        <HStack gap={3} justifyContent="center">
          <Button variant={'primary'} loading={isStxPending} onClick={() => requestStx()}>
            Request STX
          </Button>
          <Button variant={'primary'} loading={isSbtcPending} onClick={requestSbtc}>
            Request sBTC
          </Button>
        </HStack>
        <Button
          size={'xs'}
          fontSize={'xs'}
          variant={'secondary'}
          onClick={() => handleStackingRequest()}
        >
          {getStackingLabel()}
        </Button>
      </Stack>
      <Stack gap={2} width="full" maxWidth="440px" pt={4}>
        <Text fontSize={'sm'}>
          Both faucets are also available as an API, no authentication required.
        </Text>
        <CurlExample command={getFaucetCurlCommand(apiUrl, 'stx')} />
        <CurlExample command={getFaucetCurlCommand(apiUrl, 'sbtc')} />
        <Link href={FAUCET_DOCS_URL} target="_blank" rel="noopener noreferrer" fontSize={'xs'}>
          Faucet API documentation
        </Link>
      </Stack>
    </Stack>
  );
};

export default Faucet;
