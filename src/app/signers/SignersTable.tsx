'use client';

import { Flex, Table } from '@chakra-ui/react';
import styled from '@emotion/styled';
import { ReactNode, Suspense, useCallback, useMemo, useState } from 'react';

import { CopyButton } from '../../common/components/CopyButton';
import { ExplorerLink, TxLink } from '../../common/components/ExplorerLinks';
import { Section } from '../../common/components/Section';
import {
  useInfiniteQueryResult,
  useSuspenseInfiniteQueryResult,
} from '../../common/hooks/useInfiniteQueryResult';
import { useSuspensePoxInfoRaw } from '../../common/queries/usePoxInforRaw';
import { truncateMiddleDeprecated, truncateStxContractId } from '../../common/utils/utils';
import { Skeleton } from '../../components/ui/skeleton';
import { Text } from '../../ui/Text';
import { ScrollableBox } from '../_components/BlockList/ScrollableDiv';
import { ExplorerErrorBoundary } from '../_components/ErrorBoundary';
import { useSuspenseCurrentStackingCycle } from '../_components/Stats/CurrentStackingCycle/useCurrentStackingCycle';
import { CycleFilter } from './CycleFilter';
import { removeStackingDaoFromName } from './SignerDistributionLegend';
import { SortByVotingPowerFilter, VotingPowerSortOrder } from './SortByVotingPowerFilter';
import { mobileBorderCss } from './consts';
import {
  SignerMetricsSignerForCycle,
  useSignerMetricsSignersForCycle,
} from './data/signer-metrics-hooks';
import { PoxSigner, useSuspensePoxSigners } from './data/useSigners';
import { useStakingSignerStakers, useStakingSigners } from './data/useStakingSigners';
import { SignersTableSkeleton } from './skeleton';
import {
  StakerCounts,
  buildSignerKeyToManagersMap,
  computeStakerCounts,
  formatStakerTypeSplit,
  getPoxContractFirstCycleId,
  getSignerKeyName,
  isPox5Contract,
} from './utils';

// Rendering states for the Addresses cell on pox-5 networks; undefined means
// the legacy v2-derived numStackers should be shown instead
export type AddressesCellData =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; counts: StakerCounts };

const StyledTable = styled(Table.Root)`
  th {
    border-bottom: none;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

export const SignersTableHeader = ({
  headerTitle,
  isFirst,
}: {
  headerTitle: string;
  isFirst: boolean;
}) => (
  <Table.ColumnHeader
    py={3}
    px={6}
    border="none"
    css={isFirst ? mobileBorderCss : {}}
    width="fit-content"
    position={isFirst ? 'sticky' : 'unset'}
    left={0}
    bg="surface"
  >
    <Flex
      bg="hoverBackground"
      px={2.5}
      py={2}
      borderRadius="md"
      justifyContent="center"
      alignItems="center"
      width="fit-content"
    >
      <Text
        fontWeight="medium"
        whiteSpace="nowrap"
        fontSize="xs"
        color={'table.header.text'}
        textTransform="none"
        letterSpacing="normal"
      >
        {headerTitle}
      </Text>
    </Flex>
  </Table.ColumnHeader>
);

export const signersTableHeaders = [
  'Signer key',
  'Entity',
  'Addresses',
  'Voting power',
  'STX stacked',
  'Latency',
  'Approved / Rejected / Missing',
];

export function formatSignerProposalMetric(metric: number): string {
  if (isNaN(metric)) return '-';
  if (metric === 0) return '0%';
  if (metric === 1) return '100%';
  return `${(metric * 100).toFixed(1)}%`;
}

export function formatSignerLatency(latencyInMs: number, missing: number): string {
  if (missing === 1 || isNaN(missing)) return '-';
  if (latencyInMs === 0) return '0s';
  return `${(latencyInMs / 1000).toFixed(2)}s`;
}

export const SignersTableHeaders = ({
  showSignerManager = false,
}: {
  showSignerManager?: boolean;
}) => {
  const headers = showSignerManager
    ? [...signersTableHeaders.slice(0, 2), 'Signer manager', ...signersTableHeaders.slice(2)]
    : signersTableHeaders;
  return (
    <Table.Row>
      {headers.map((header, i) => (
        <SignersTableHeader
          key={`signers-table-header-${header}`}
          headerTitle={header}
          isFirst={i === 0}
        />
      ))}
    </Table.Row>
  );
};

export function getEntityName(signerKey: string) {
  const entityName = removeStackingDaoFromName(getSignerKeyName(signerKey));
  return entityName === 'unknown' ? '-' : entityName;
}

const SignerManagerLink = ({ manager }: { manager: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Flex
      gap={2}
      alignItems="center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {truncateStxContractId(manager, 4, 5, 24, 8) ? (
        <TxLink
          txId={manager}
          fontSize="sm"
          whiteSpace="nowrap"
          _hover={{ textDecoration: 'underline' }}
        >
          {truncateStxContractId(manager, 4, 5, 24, 8)}
        </TxLink>
      ) : (
        // Not a valid contract id, so there is no /txid page to link to
        <Text fontSize="sm" whiteSpace="nowrap">
          {truncateMiddleDeprecated(manager)}
        </Text>
      )}
      <CopyButton
        initialValue={manager}
        aria-label={`copy ${manager}`}
        h={5}
        w={5}
        css={{
          opacity: isHovered ? 1 : 0,
          position: 'relative',
          transition: 'opacity 0.4s ease-in-out',
        }}
      />
    </Flex>
  );
};

export const SignerTableRow = ({
  index,
  isFirst,
  isLast,
  signerKey,
  votingPower,
  stxStaked,
  numStackers,
  addressesData,
  signerManagers,
  latency,
  approved,
  rejected,
  missing,
}: {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  addressesData?: AddressesCellData;
  // pox-5 only; undefined = hide the column, null = still loading
  signerManagers?: string[] | null;
} & SignerRowInfo) => {
  const [isSignerKeyHovered, setIsSignerKeyHovered] = useState(false);

  return (
    <Table.Row
      style={{
        borderTop: isFirst ? 'none' : '',
        borderBottom: isLast ? 'none' : '',
      }}
    >
      <Table.Cell py={3} px={6} css={mobileBorderCss} position={'sticky'} left={0} bg="surface">
        <Flex
          gap={2}
          alignItems="center"
          onMouseEnter={() => setIsSignerKeyHovered(true)}
          onMouseLeave={() => setIsSignerKeyHovered(false)}
        >
          <ExplorerLink
            fontSize="sm"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            _hover={{ textDecoration: 'underline' }}
            href={`/signer/${signerKey}`}
          >
            <Text fontSize="sm" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
              {truncateMiddleDeprecated(signerKey)}
            </Text>
          </ExplorerLink>
          <CopyButton
            initialValue={signerKey}
            aria-label={'copy signer key'}
            h={5}
            w={5}
            css={{
              opacity: isSignerKeyHovered ? 1 : 0,
              position: 'relative',
              transition: 'opacity 0.4s ease-in-out',
            }}
          />
        </Flex>
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm" pl={2}>
          {getEntityName(signerKey)}
        </Text>
      </Table.Cell>
      {signerManagers !== undefined && (
        <Table.Cell py={3} px={6}>
          {signerManagers === null ? (
            <Skeleton height={4} width={28} ml={2} />
          ) : signerManagers.length === 0 ? (
            <Text whiteSpace="nowrap" fontSize="sm" pl={2}>
              -
            </Text>
          ) : (
            <Flex direction="column" gap={1} pl={2}>
              {signerManagers.map(manager => (
                <SignerManagerLink key={manager} manager={manager} />
              ))}
            </Flex>
          )}
        </Table.Cell>
      )}
      <Table.Cell py={3} px={6}>
        {!addressesData ? (
          <Text whiteSpace="nowrap" fontSize="sm" pl={2}>
            {numStackers}
          </Text>
        ) : addressesData.status === 'loading' ? (
          <Skeleton height={4} width={10} ml={2} />
        ) : addressesData.status === 'unavailable' ? (
          <Text whiteSpace="nowrap" fontSize="sm" pl={2}>
            -
          </Text>
        ) : (
          <Flex direction="column" pl={2}>
            <Text whiteSpace="nowrap" fontSize="sm">
              {addressesData.counts.total}
            </Text>
            {addressesData.counts.total > 0 && addressesData.counts.split && (
              <Text whiteSpace="nowrap" fontSize="xs" color="textSubdued">
                {formatStakerTypeSplit(addressesData.counts.split)}
              </Text>
            )}
          </Flex>
        )}
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {`${votingPower.toFixed(2)}%`}
        </Text>
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {Number(stxStaked.toFixed(0)).toLocaleString()}
        </Text>
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {formatSignerLatency(latency, missing)}
        </Text>
      </Table.Cell>
      <Table.Cell py={3} px={6}>
        <Text whiteSpace="nowrap" fontSize="sm">
          {`${formatSignerProposalMetric(approved)} / ${formatSignerProposalMetric(
            rejected
          )} / ${formatSignerProposalMetric(missing)}`}
        </Text>
      </Table.Cell>
    </Table.Row>
  );
};

export function SignersTableLayout({
  title,
  topRight,
  signersTableHeaders,
  signersTableRows,
}: {
  title: ReactNode;
  topRight?: ReactNode;
  signersTableHeaders: ReactNode;
  signersTableRows: ReactNode;
}) {
  return (
    <Section title={title} topRight={topRight}>
      <ScrollableBox>
        <StyledTable width="full">
          <Table.Header>{signersTableHeaders}</Table.Header>
          <Table.Body>{signersTableRows}</Table.Body>
        </StyledTable>
      </ScrollableBox>
    </Section>
  );
}
interface SignerRowInfo {
  signerKey: string;
  votingPower: number;
  stxStaked: number;
  numStackers: number;
  latency: number;
  approved: number;
  rejected: number;
  missing: number;
}

export function formatSignerRowData(
  signerData: PoxSigner,
  signerMetrics: SignerMetricsSignerForCycle
): SignerRowInfo {
  const totalProposals =
    signerMetrics.proposals_accepted_count +
    signerMetrics.proposals_rejected_count +
    signerMetrics.proposals_missed_count;
  return {
    signerKey: signerData.signing_key,
    votingPower: signerData.weight_percent,
    stxStaked: parseFloat(signerData.stacked_amount) / 1_000_000,
    numStackers: signerData.pooled_stacker_count + signerData.solo_stacker_count,
    latency: signerMetrics.average_response_time_ms,
    approved: signerMetrics.proposals_accepted_count / totalProposals,
    rejected: signerMetrics.proposals_rejected_count / totalProposals,
    missing: signerMetrics.proposals_missed_count / totalProposals,
  };
}

const SignersTableBase = () => {
  const [votingPowerSortOrder, setVotingPowerSortOrder] = useState(VotingPowerSortOrder.Desc);
  const { currentCycleId } = useSuspenseCurrentStackingCycle();
  const [selectedCycle, setSelectedCycle] = useState<string>(currentCycleId.toString());

  const cycleFilterOnSubmitHandler = useCallback(
    (cycle: string) => {
      setSelectedCycle(cycle);
    },
    [setSelectedCycle]
  );

  const signersResponse = useSuspensePoxSigners(parseInt(selectedCycle), {
    limit: 100,
  });
  const signers = useSuspenseInfiniteQueryResult<PoxSigner>(signersResponse);

  if (!signers) {
    throw new Error('Signers data is not available');
  }

  const signersMetricsResponse = useSignerMetricsSignersForCycle(parseInt(selectedCycle), {
    limit: 100,
  });

  const signersMetrics =
    useInfiniteQueryResult<SignerMetricsSignerForCycle>(signersMetricsResponse);

  const { data: poxInfo } = useSuspensePoxInfoRaw();
  const isPox5 = isPox5Contract(poxInfo?.contract_id);
  const selectedCycleId = parseInt(selectedCycle);
  const isCurrentCycleSelected = selectedCycleId === currentCycleId;
  // On a transitioned chain, cycles that ran before pox-5 keep their valid
  // v2-derived counts
  const pox5FirstCycleId = getPoxContractFirstCycleId(poxInfo?.contract_versions, 'pox-5');
  const useLegacyCounts =
    !isPox5 || (pox5FirstCycleId !== undefined && selectedCycleId < pox5FirstCycleId);

  const { data: stakingSigners, isError: isStakingSignersError } = useStakingSigners(isPox5);
  const signerKeyToManagers = useMemo(
    () => buildSignerKeyToManagersMap(stakingSigners ?? []),
    [stakingSigners]
  );
  const signerManagers = useMemo(
    () =>
      isPox5 && isCurrentCycleSelected
        ? Array.from(
            new Set(
              signers.flatMap(signer => signerKeyToManagers[signer.signing_key.toLowerCase()] ?? [])
            )
          )
        : [],
    [isPox5, isCurrentCycleSelected, signers, signerKeyToManagers]
  );
  const { byManager: stakersByManager, isError: isStakersError } =
    useStakingSignerStakers(signerManagers);

  const getAddressesData = useCallback(
    (signerKey: string): AddressesCellData => {
      // The v3 staking API reflects current state only, so counts can't be
      // reconstructed for other pox-5 cycles
      if (!isCurrentCycleSelected) return { status: 'unavailable' };
      if (isStakingSignersError || isStakersError) return { status: 'unavailable' };
      if (!stakingSigners) return { status: 'loading' };
      const managers = signerKeyToManagers[signerKey.toLowerCase()] ?? [];
      if (managers.length === 0) return { status: 'unavailable' };
      const pages = managers.map(manager => stakersByManager[manager]);
      if (pages.some(page => !page)) return { status: 'loading' };
      return { status: 'ready', counts: computeStakerCounts(pages) };
    },
    [
      isCurrentCycleSelected,
      isStakingSignersError,
      isStakersError,
      stakingSigners,
      signerKeyToManagers,
      stakersByManager,
    ]
  );

  const signersData = useMemo(() => {
    return signers
      .map(signer => {
        const metrics =
          signersMetrics.find(m => m.signer_key === signer.signing_key) ||
          ({} as SignerMetricsSignerForCycle);
        return formatSignerRowData(signer, metrics);
      })
      .sort((a, b) =>
        votingPowerSortOrder === 'desc'
          ? b.votingPower - a.votingPower
          : a.votingPower - b.votingPower
      );
  }, [signers, signersMetrics, votingPowerSortOrder]);

  return (
    <SignersTableLayout
      topRight={
        <Flex gap={2} flexWrap="wrap">
          <SortByVotingPowerFilter
            setVotingPowerSortOrder={setVotingPowerSortOrder}
            votingPowerSortOrder={votingPowerSortOrder}
          />
          <Flex
            gap={2}
            alignItems="center"
            border="1px solid"
            borderColor="borderPrimary"
            px={4}
            py={2}
            borderRadius="md"
            boxSizing="border-box"
            h={10}
            fontSize={'sm'}
          >
            <Text>Cycle:</Text>
            <CycleFilter onChange={cycleFilterOnSubmitHandler} defaultCycleId={selectedCycle} />
          </Flex>
        </Flex>
      }
      title={<Text fontWeight="medium">{signersData.length} Active Signers</Text>}
      signersTableHeaders={
        // Manager registrations are current state, so the column would
        // misattribute today's managers to historical cycles
        <SignersTableHeaders showSignerManager={isPox5 && isCurrentCycleSelected} />
      }
      signersTableRows={signersData.map((signer, i) => (
        <SignerTableRow
          key={`signers-table-row-${signer.signerKey}`}
          index={i}
          {...signersData[i]}
          addressesData={useLegacyCounts ? undefined : getAddressesData(signer.signerKey)}
          signerManagers={
            !isPox5 || !isCurrentCycleSelected
              ? undefined
              : isStakingSignersError
                ? []
                : !stakingSigners
                  ? null
                  : (signerKeyToManagers[signer.signerKey.toLowerCase()] ?? [])
          }
          isFirst={i === 0}
          isLast={i === signers.length - 1}
        />
      ))}
    />
  );
};

const SignerTable = () => {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{
        title: 'Signers',
        gridColumnStart: ['1', '1', '2'],
        gridColumnEnd: ['2', '2', '3'],
        minWidth: 0,
      }}
      tryAgainButton
    >
      <Suspense fallback={<SignersTableSkeleton />}>
        <SignersTableBase />
      </Suspense>
    </ExplorerErrorBoundary>
  );
};

export default SignerTable;
