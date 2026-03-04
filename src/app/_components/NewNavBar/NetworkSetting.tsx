'use client';

import { openModal } from '@/common/components/modals/modal-slice';
import { DEFAULT_DEVNET_SERVER, MODALS } from '@/common/constants/constants';
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useCustomNetworkApiInfo } from '@/common/queries/useCustomNetworkApiInfo';
import { useAppDispatch } from '@/common/state/hooks';
import { Network } from '@/common/types/network';
import { buildUrl } from '@/common/utils/buildUrl';
import { isLocalhost } from '@/common/utils/network-utils';
import { Button } from '@/components/ui/button';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import { ClientOnly, Flex, Icon, IconButton, Stack } from '@chakra-ui/react';
import { Check, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

const DeleteNetworkMessage = ({
  onDelete,
  onCancel,
}: {
  onDelete: () => void;
  onCancel: () => void;
}) => {
  return (
    <Stack
      p={3}
      border="1px solid"
      borderColor="feedback.red-400"
      borderRadius="redesign.md"
      pointerEvents="auto"
      cursor="default"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Text fontSize={{ base: 'sm', lg: 'xs' }} fontWeight="medium" color="textPrimary">
        Delete Network
      </Text>
      <Flex gap={2}>
        <Button
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          bg="feedback.red-500"
        >
          <Text
            fontSize={{ base: 'sm', lg: 'xs' }}
            fontWeight="medium"
            color="var(--stacks-colors-neutral-sand-50)"
          >
            Delete
          </Text>
        </Button>
        <Button
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onCancel();
          }}
          bg="var(--stacks-colors-neutral-sand-500)"
        >
          <Text
            fontSize={{ base: 'sm', lg: 'xs' }}
            fontWeight="medium"
            color="var(--stacks-colors-neutral-sand-50)"
          >
            Cancel
          </Text>
        </Button>
      </Flex>
    </Stack>
  );
};

const NetworkLabel = ({ network }: { network: Network }) => {
  const { activeNetwork, removeCustomNetwork } = useGlobalContext();
  const isActiveNetwork = activeNetwork.url === network.url;

  const isMainnet = network.url === DEFAULT_MAINNET_SERVER;
  const isTestnet = network.url === DEFAULT_TESTNET_SERVER;
  const isDefault = isMainnet || isTestnet;
  const isDevnet = network.url === DEFAULT_DEVNET_SERVER;

  const isLocalNetwork = isLocalhost(network.url);

  const { error, isFetching } = useCustomNetworkApiInfo(network.url, {
    enabled: !!network.url && !isDefault && !isLocalNetwork,
  });
  const isDisabled = isFetching || !!error;

  const isNetworkRemovable = useMemo(
    () => network.isCustomNetwork && !isDevnet && !isActiveNetwork,
    [network.isCustomNetwork, isDevnet, isActiveNetwork]
  );

  const [isDeletingNetwork, setIsDeletingNetwork] = useState(false);

  return (
    <Link
      href={isActiveNetwork || isDisabled ? undefined : buildUrl('/', network)}
      variant="noUnderline"
      w="full"
      pointerEvents={isActiveNetwork || isDisabled ? 'none' : 'auto'}
      _hover={{
        bg: isActiveNetwork ? 'transparent' : 'surfaceTertiary',
      }}
      bg={isDeletingNetwork ? 'surfaceTertiary' : 'transparent'}
      borderColor="redesignBorderSecondary"
      borderRadius="redesign.md"
      key={network.url}
      className="group"
      suppressHydrationWarning
    >
      <Stack
        gap={3}
        w="full"
        border={isActiveNetwork ? '1px solid' : 'none'}
        px={3}
        py={2}
        borderColor="redesignBorderSecondary"
        borderRadius="redesign.md"
      >
        <Flex justifyContent="space-between" alignItems="center" w="full">
          <Stack gap={0}>
            <Text
              fontSize={{ base: 'sm', lg: 'xs' }}
              fontWeight="medium"
              color={
                isDisabled ? 'textTertiary' : isActiveNetwork ? 'textPrimary' : 'textSecondary'
              }
              _groupHover={{
                color: !isDisabled && !isActiveNetwork ? 'textPrimary' : 'textSecondary',
              }}
            >
              {network.label}
            </Text>
            <Text
              fontSize={{ base: 'sm', lg: 'xs' }}
              color={isDisabled ? 'textTertiary' : 'textSecondary'}
            >
              {network.url}
            </Text>
          </Stack>
          {isActiveNetwork ? (
            <Flex
              bg="surfaceInvert"
              px={2}
              py={1}
              h={{ base: 8, lg: 6 }}
              w={{ base: 12, lg: 8 }}
              borderRadius="redesign.md"
              alignItems="center"
              justifyContent="center"
            >
              <Icon h={{ base: 5, lg: 4 }} w={{ base: 5, lg: 4 }} color="iconInvert">
                <Check />
              </Icon>
            </Flex>
          ) : isNetworkRemovable ? (
            <IconButton
              h={4}
              w={4}
              color="iconPrimary"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                setIsDeletingNetwork(true);
              }}
              bg={'transparent'}
            >
              <Trash />
            </IconButton>
          ) : isDisabled ? (
            <Text fontSize="xs" color="textTertiary">
              Offline
            </Text>
          ) : null}
        </Flex>
        {isDeletingNetwork && (
          <DeleteNetworkMessage
            onDelete={() => {
              removeCustomNetwork(network);
              setIsDeletingNetwork(false);
            }}
            onCancel={() => setIsDeletingNetwork(false)}
          />
        )}
      </Stack>
    </Link>
  );
};

export const NetworkSetting = () => {
  const dispatch = useAppDispatch();
  const { networks } = useGlobalContext();

  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <Text fontSize={{ base: 'sm', lg: 'xs' }} fontWeight="medium" color="textPrimary">
          Network
        </Text>
        <Stack gap={1.5} w="full">
          <ClientOnly>
            {' '}
            {/* prevents hydration mismatch */}
            {Object.entries(networks).map(([url, network]) => (
              <NetworkLabel key={network.url} network={network} />
            ))}
          </ClientOnly>
        </Stack>
      </Stack>
      <Button
        w="fit-content"
        onClick={() => dispatch(openModal(MODALS.ADD_NETWORK_NEW))}
        variant="redesignPrimary"
        size="small"
      >
        Add a network
      </Button>
    </Stack>
  );
};
