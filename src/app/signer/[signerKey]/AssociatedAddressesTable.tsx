import { Box, Flex, Stack } from '@chakra-ui/react';
import { ReactNode, Suspense, useMemo, useState } from 'react';

import {
  SignersStackersData,
  useSuspenseSignerStackersInfinite,
} from '../../../app/signers/data/UseSignerAddresses';
import { CopyButton } from '../../../common/components/CopyButton';
import { ListFooter } from '../../../common/components/ListFooter';
import { Section } from '../../../common/components/Section';
import { useSuspensePoxInfoRaw } from '../../../common/queries/usePoxInforRaw';
import { Text } from '../../../ui/Text';
import { ExplorerErrorBoundary } from '../../_components/ErrorBoundary';
import { useSuspenseCurrentStackingCycle } from '../../_components/Stats/CurrentStackingCycle/useCurrentStackingCycle';
import {
  StakingSignerStaker,
  useStakingSignerStakersForKey,
} from '../../signers/data/useStakingSigners';
import { isPox5Contract } from '../../signers/utils';
import { AssociatedAddressesTableSkeleton } from './skeleton';

export const AssociatedAddressesTableLayout = ({
  addresses,
  footer,
}: {
  addresses: ReactNode;
  footer: ReactNode;
}) => {
  return (
    <Section title="Associated addresses">
      <Stack gap={0}>
        <Box h="auto" overflow="auto">
          {addresses}
        </Box>
        {footer}
      </Stack>
    </Section>
  );
};

export const AssociatedAddressListItemLayout = ({
  children,
  isLast,
}: {
  children: ReactNode;
  isLast: boolean;
}) => {
  return (
    <Flex
      alignItems={'center'}
      gap={1}
      py={6}
      borderBottom="1px solid var(--stacks-colors-borderSecondary)"
      _last={{
        borderBottom: 'none',
      }}
    >
      {children}
    </Flex>
  );
};

export const AssociatedAddressListItem = ({
  stacker,
  isLast,
}: {
  stacker: SignersStackersData;
  isLast: boolean;
}) => {
  return (
    <AssociatedAddressListItemLayout isLast={isLast}>
      <Text fontSize={'sm'}>{stacker.stacker_address}</Text>
      <CopyButton
        className={'fancy-copy'}
        initialValue={stacker.stacker_address}
        aria-label={'copy row'}
        color="textSubdued"
      />
    </AssociatedAddressListItemLayout>
  );
};

export const AssociatedStakerListItem = ({
  staker,
  isLast,
}: {
  staker: StakingSignerStaker;
  isLast: boolean;
}) => {
  return (
    <AssociatedAddressListItemLayout isLast={isLast}>
      <Text fontSize={'sm'}>{staker.staker}</Text>
      {staker.types.length > 0 && (
        <Text fontSize={'xs'} color="textSubdued">
          {staker.types.map(type => type.toUpperCase()).join(' · ')}
        </Text>
      )}
      <CopyButton
        className={'fancy-copy'}
        initialValue={staker.staker}
        aria-label={'copy staker address'}
        color="textSubdued"
      />
    </AssociatedAddressListItemLayout>
  );
};

const POX5_LIST_PAGE_SIZE = 10;

export const AssociatedAddressesTableBase = ({ signerKey }: { signerKey: string }) => {
  const { currentCycleId } = useSuspenseCurrentStackingCycle();
  const { data: poxInfo } = useSuspensePoxInfoRaw();
  const isPox5 = isPox5Contract(poxInfo?.contract_id);

  const {
    stakers: pox5Stakers,
    isLoaded: arePox5StakersLoaded,
    isError: isPox5StakersError,
  } = useStakingSignerStakersForKey(signerKey, isPox5);
  const [visibleCount, setVisibleCount] = useState(POX5_LIST_PAGE_SIZE);

  const {
    data: signerStackers,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useSuspenseSignerStackersInfinite(currentCycleId, signerKey, { enabled: !isPox5 });

  const stackers = useMemo(
    () => signerStackers?.pages.flatMap(page => page.results) ?? [],
    [signerStackers]
  );

  if (isPox5) {
    if (isPox5StakersError) {
      return (
        <AssociatedAddressesTableLayout
          addresses={
            <Text fontSize={'sm'} color="textSubdued" py={6}>
              Failed to load addresses.
            </Text>
          }
          footer={null}
        />
      );
    }
    if (!arePox5StakersLoaded) {
      return <AssociatedAddressesTableSkeleton />;
    }
    const visibleStakers = pox5Stakers.slice(0, visibleCount);
    return (
      <AssociatedAddressesTableLayout
        addresses={visibleStakers.map((staker, i) => (
          <AssociatedStakerListItem
            key={staker.staker}
            staker={staker}
            isLast={i === visibleStakers.length - 1}
          />
        ))}
        footer={
          <ListFooter
            label="addresses"
            isLoading={false}
            fetchNextPage={() => setVisibleCount(count => count + POX5_LIST_PAGE_SIZE)}
            hasNextPage={visibleCount < pox5Stakers.length}
            pb={6}
            position={'sticky'}
            bottom={0}
            bg="surface"
          />
        }
      />
    );
  }

  return (
    <AssociatedAddressesTableLayout
      addresses={stackers.map((stacker, i) => (
        <AssociatedAddressListItem
          key={stacker.stacker_address}
          stacker={stacker}
          isLast={i === stackers.length - 1}
        />
      ))}
      footer={
        <ListFooter
          label="addresses"
          isLoading={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          pb={6}
          position={'sticky'}
          bottom={0}
          bg="surface"
        />
      }
    />
  );
};

export const AssociatedAddressesTable = ({ signerKey }: { signerKey: string }) => {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{
        title: 'Associated Addresses',
        gridColumnStart: ['1', '1', '2'],
        gridColumnEnd: ['2', '2', '3'],
        minWidth: 0,
      }}
      tryAgainButton
    >
      <Suspense fallback={<AssociatedAddressesTableSkeleton />}>
        <AssociatedAddressesTableBase signerKey={signerKey} />
      </Suspense>
    </ExplorerErrorBoundary>
  );
};
