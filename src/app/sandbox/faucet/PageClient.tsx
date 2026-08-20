'use client';

import { HStack, Icon, Stack } from '@chakra-ui/react';
import { NextPage } from 'next';
import React from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useFaucet } from '../../../common/queries/useFaucet';
import { NetworkModes } from '../../../common/types/network';
import { isAddressForNetworkMode, validateStacksAddress } from '../../../common/utils/utils';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Text } from '../../../ui/Text';
import StxIcon from '../../../ui/icons/StxIcon';
import { Title } from '../../../ui/typography';
import { useUser } from '../hooks/useUser';

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

const Faucet: NextPage = () => {
  const { stxAddress } = useUser();
  const networkMode = useGlobalContext().activeNetwork.mode;
  const [address, setAddress] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  const [stackingIndex, setIndex] = React.useState(0);
  const { mutate: runFaucetStx, error, isSuccess, isPending } = useFaucet();

  React.useEffect(() => {
    if (stxAddress) setAddress(stxAddress);
  }, [stxAddress]);

  const addressError = getRecipientAddressError(address.trim(), networkMode);
  const errorMessage = getErrorMessage(error);

  const requestStx = (stacking?: boolean) => {
    setShowValidation(true);
    if (addressError) return;
    runFaucetStx({ address: address.trim(), stacking });
  };

  const handleStackingRequest = () => {
    if (stackingIndex <= 3) {
      setIndex(i => ++i);
      if (stackingIndex === 3) {
        requestStx(true);
      }
    }
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
    <Stack alignItems={'center'} mt={46} gap={6}>
      <Icon h={10} w={10}>
        <StxIcon />
      </Icon>
      <Title>STX Faucet</Title>
      <Text fontSize={'sm'}>Need STX to test the network? The faucet can top you up!</Text>
      {!!errorMessage ? <Text color={'error'}>{errorMessage}</Text> : null}
      {isSuccess ? (
        <HStack gap={4} fontSize={'sm'}>
          <Text>💰</Text>
          <Text>STX coming your way shortly!</Text>
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
        <Button variant={'primary'} mx="auto" loading={isPending} onClick={() => requestStx()}>
          Request STX
        </Button>
        <Button
          size={'xs'}
          fontSize={'xs'}
          variant={'secondary'}
          onClick={() => handleStackingRequest()}
        >
          {getStackingLabel()}
        </Button>
      </Stack>
    </Stack>
  );
};

export default Faucet;
