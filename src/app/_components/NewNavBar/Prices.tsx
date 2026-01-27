import { FABRIZIO_ADDRESSES, FABRIZIO_POLL_INTERVAL } from '@/common/constants/constants';
import { useFabrizio } from '@/common/context/FabrizioContext';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useAddressTxs } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { buildUrl } from '@/common/utils/buildUrl';
import { usdFormatter } from '@/common/utils/utils';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import BitcoinIcon from '@/ui/icons/BitcoinIcon';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon } from '@chakra-ui/react';

export const Prices = () => {
  const { tokenPrice, activeNetwork } = useGlobalContext();
  const { isEnabled: isFabrizioEnabled } = useFabrizio();

  // Query both Fabrizio addresses to get combined transaction count
  // Add refetchInterval to live update when new transactions appear
  const { data: fabrizioTxData1 } = useAddressTxs(FABRIZIO_ADDRESSES[0], 1, 0, {
    enabled: isFabrizioEnabled,
    refetchInterval: isFabrizioEnabled ? FABRIZIO_POLL_INTERVAL : false,
    staleTime: 0, // Always consider stale to allow refetching
    retry: false, // Don't retry on error to avoid timeout issues
  });

  const { data: fabrizioTxData2 } = useAddressTxs(FABRIZIO_ADDRESSES[1], 1, 0, {
    enabled: isFabrizioEnabled,
    refetchInterval: isFabrizioEnabled ? FABRIZIO_POLL_INTERVAL : false,
    staleTime: 0, // Always consider stale to allow refetching
    retry: false, // Don't retry on error to avoid timeout issues
  });

  // Combine totals from both addresses
  const fabrizioTxCount = (fabrizioTxData1?.total ?? 0) + (fabrizioTxData2?.total ?? 0);
  const hasFabrizioData =
    (fabrizioTxData1?.total !== undefined && fabrizioTxData1?.total !== null) ||
    (fabrizioTxData2?.total !== undefined && fabrizioTxData2?.total !== null);

  const formattedBtcPrice = tokenPrice.btcPrice ? usdFormatter.format(tokenPrice.btcPrice) : '';
  const formattedStxPrice = tokenPrice.stxPrice ? usdFormatter.format(tokenPrice.stxPrice) : '';

  // Link to first address page (or could link to a combined view if available)
  const fabrizioAddressUrl = buildUrl(`/address/${FABRIZIO_ADDRESSES[0]}`, activeNetwork);
  return (
    <Flex gap={1.5} alignItems="center">
      <Flex
        gap={1}
        alignItems="center"
        px={{ base: 2, lg: 2 }}
        py={{ base: 2, lg: 1.5 }}
        borderRadius="redesign.sm"
        bg="surfacePrimary"
      >
        <Icon h={3} w={3} color="iconPrimary">
          <StacksIconThin />
        </Icon>
        <Text
          textStyle={{ base: 'text-regular-sm', lg: 'text-regular-xs' }}
          color="textPrimary"
          fontStyle="var(--font-matter-mono)"
        >
          {!formattedStxPrice ? 'N/A' : formattedStxPrice}
        </Text>
      </Flex>
      <Flex
        gap={1}
        alignItems="center"
        px={{ base: 2, lg: 2 }}
        py={{ base: 2, lg: 1.5 }}
        borderRadius="redesign.sm"
        bg="surfacePrimary"
      >
        <Icon h={3.5} w={3.5} color="accent.bitcoin-600">
          <BitcoinIcon />
        </Icon>
        <Text
          textStyle={{ base: 'text-regular-sm', lg: 'text-regular-xs' }}
          color="textPrimary"
          fontStyle="var(--font-matter-mono)"
        >
          {!formattedBtcPrice ? 'N/A' : formattedBtcPrice}
        </Text>
      </Flex>
      {isFabrizioEnabled && hasFabrizioData && (
        <Link href={fabrizioAddressUrl} variant="noUnderline" _hover={{ opacity: 0.8 }}>
          <Flex
            gap={1}
            alignItems="center"
            px={{ base: 2, lg: 2 }}
            py={{ base: 2, lg: 1.5 }}
            borderRadius="redesign.sm"
            bg="surfacePrimary"
            cursor="pointer"
          >
            <Text
              textStyle={{ base: 'text-regular-sm', lg: 'text-regular-xs' }}
              color="textPrimary"
              fontStyle="var(--font-matter-mono)"
            >
              🍕 {fabrizioTxCount.toLocaleString()}
            </Text>
          </Flex>
        </Link>
      )}
    </Flex>
  );
};
