'use client';

import { AccordionItemContent, Box, Flex, HStack, Icon, Stack } from '@chakra-ui/react';
import { CaretDown, Info } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

import { Badge } from '../../../common/components/Badge';
import { ExplorerLink } from '../../../common/components/ExplorerLinks';
import { Section } from '../../../common/components/Section';
import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useContractById } from '../../../common/queries/useContractById';
import { useAppDispatch } from '../../../common/state/hooks';
import { buildUrl } from '../../../common/utils/buildUrl';
import {
  AccordionItem,
  AccordionItemTrigger,
  AccordionRoot,
} from '../../../components/ui/accordion';
import { MempoolTxListItemMini } from '../../../features/txs-list/ListItem/MempoolTxListItemMini';
import { TxListItemMini } from '../../../features/txs-list/ListItem/TxListItemMini';
import { FilterButton } from '../../../features/txsFilterAndSort/FilterButton';
import { AllTransactionsFilteredMessage } from '../../../features/txsFilterAndSort/TransactionMessages';
import { useFilterAndSortState } from '../../../features/txsFilterAndSort/useFilterAndSortState';
import { IconButton } from '../../../ui/IconButton';
import { Text } from '../../../ui/Text';
import FunctionXIcon from '../../../ui/icons/FunctionX';
import { Caption, Title } from '../../../ui/typography';
import { ExplorerErrorBoundary } from '../../_components/ErrorBoundary';
import { useUser } from '../hooks/useUser';
import { setCodeBody, toggleRightPanel } from '../sandbox-slice';

const LoadButton = ({ codeBody }: { codeBody: string }) => {
  const router = useRouter();
  const network = useGlobalContext().activeNetwork;
  const [loaded, setLoaded] = React.useState(false);
  const [clicked, setClicked] = React.useState(false);
  const dispatch = useAppDispatch();
  return loaded ? (
    <Badge userSelect="none" color={`text`}>
      Loaded!
    </Badge>
  ) : !clicked ? (
    <Badge
      userSelect="none"
      _hover={{ cursor: 'pointer', color: `textSubdued` }}
      color={`text`}
      onClick={() => setClicked(true)}
    >
      Load in editor
    </Badge>
  ) : (
    <Badge userSelect="none" color={`text`}>
      <Flex>
        <Box
          _hover={{ cursor: 'pointer', color: `textSubdued` }}
          pr={2}
          onClick={() => setClicked(false)}
        >
          Cancel
        </Box>
        <Box
          _hover={{ cursor: 'pointer', color: `textSubdued` }}
          pl="8px"
          borderWidth="1px"
          onClick={() => {
            setClicked(false);
            dispatch(setCodeBody({ codeBody }));
            setLoaded(true);
            void router.push(buildUrl('/sandbox/deploy', network));
            setTimeout(() => {
              setLoaded(false);
            }, 3000);
          }}
        >
          Confirm
        </Box>
      </Flex>
    </Badge>
  );
};

const TxDetailsFunctions = ({
  hasFunctionsAvailable,
  contractInterface,
  contractId,
  status,
}: any) => {
  const [fnsVisible, setFnsVisibility] = React.useState(false);
  const dispatch = useAppDispatch();

  return hasFunctionsAvailable ? (
    <>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        borderBottomWidth={fnsVisible ? '1px' : undefined}
        px="16px"
        pb="8px"
        pt="12px"
      >
        <Caption fontWeight="500">Call contract</Caption>
        <HStack gap={2} alignItems="center">
          <ExplorerLink href={`/sandbox/contract-call/${contractId}`}>
            <Badge
              userSelect="none"
              _hover={{
                cursor: 'pointer',
                color: `textSubdued`,
              }}
              color={`text`}
            >
              Load contract
            </Badge>
          </ExplorerLink>
          <IconButton
            size={6}
            onClick={() => {
              setFnsVisibility(s => !s);
            }}
            aria-label={'toggle function'}
          >
            <Icon h={4} w={4} transform={!fnsVisible ? 'none' : 'rotate(180deg)'}>
              <CaretDown />
            </Icon>
          </IconButton>
        </HStack>
      </Flex>
      {fnsVisible ? (
        <Stack maxHeight="120px" overflowY="auto">
          {contractInterface?.abi?.functions?.map((func: any, index: number, arr: any[]) => {
            return func.access !== 'private' ? (
              <Flex
                borderBottomWidth={index === arr.length - 1 ? undefined : '1px'}
                px={4}
                py={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex alignItems="center" color={`text`}>
                  {func.access === 'read_only' ? (
                    <Icon h={4.5} w={4.5}>
                      <Info />
                    </Icon>
                  ) : (
                    <Icon h={4.5} w={4.5}>
                      <FunctionXIcon />
                    </Icon>
                  )}
                  <Caption ml="4px">{func.name}</Caption>
                </Flex>
                {status === 'success' ? (
                  <ExplorerLink href={`/sandbox/contract-call/${contractId}/${func.name}`}>
                    <Badge
                      _hover={{ color: `textSubdued`, cursor: 'pointer' }}
                      color={`text`}
                      onClick={() => {
                        dispatch(toggleRightPanel());
                      }}
                    >
                      Load function
                    </Badge>
                  </ExplorerLink>
                ) : null}
              </Flex>
            ) : null;
          })}
        </Stack>
      ) : null}
    </>
  ) : null;
};

function TxErrorDetails({ tx }: { tx: Transaction }) {
  if (tx.tx_status === 'success') return null;
  const errorResult = (tx as any).tx_result?.repr;
  if (!errorResult) return null;
  return (
    <Box px="16px" py="8px" borderBottomWidth="1px">
      <Caption fontWeight="500" color="red">
        Error: {errorResult}
      </Caption>
    </Box>
  );
}

function TxDetailsBase({ tx }: { tx: Transaction }) {
  const contractId =
    tx.tx_type === 'smart_contract'
      ? tx.smart_contract.contract_id
      : tx.tx_type === 'contract_call'
        ? tx.contract_call.contract_id
        : undefined;

  const { data: contract } = useContractById(contractId);

  const hasFunctionsAvailable =
    tx.tx_type === 'smart_contract' &&
    tx.tx_status === 'success' &&
    !!contract?.abi?.functions?.length;

  if (!contract)
    return (
      <>
        <TxErrorDetails tx={tx} />
        <Text fontSize={'14px'} p={'20px'} textAlign={'center'}>
          {tx.tx_status !== 'success' && !(tx as any).tx_result?.repr
            ? 'Transaction failed'
            : 'Nothing to show'}
        </Text>
      </>
    );

  return (
    <>
      <TxErrorDetails tx={tx} />
      <Box>
        <Box>
          <Flex
            justifyContent="space-between"
            borderWidth={hasFunctionsAvailable ? '1px' : undefined}
            px="16px"
            py="8px"
            alignItems="center"
          >
            <Caption fontWeight="500">Redeploy contract</Caption>
            <LoadButton codeBody={contract.source_code} />
          </Flex>
          <TxDetailsFunctions
            contractId={contractId}
            status={tx.tx_status}
            hasFunctionsAvailable={hasFunctionsAvailable}
            contractInterface={contract}
          />
        </Box>
      </Box>
    </>
  );
}

function TxDetails({ tx }: { tx: Transaction }) {
  return (
    <ExplorerErrorBoundary>
      <TxDetailsBase tx={tx} />
    </ExplorerErrorBoundary>
  );
}

export function TransactionsPanel() {
  const { txs, mempoolTransactions } = useUser();
  const { activeFilters } = useFilterAndSortState();

  const filteredTxs = useMemo(
    () => (!activeFilters.length ? txs : txs?.filter(tx => activeFilters.includes(tx.tx_type))),
    [txs, activeFilters]
  );

  const hasTxButIsFiltered = txs?.length && filteredTxs?.length === 0;

  const pendingList = React.useMemo(
    () =>
      mempoolTransactions?.map(tx => (
        <Flex>
          <MempoolTxListItemMini key={tx.tx_id} tx={tx} />
        </Flex>
      )),
    [mempoolTransactions]
  );

  const txList = React.useMemo(
    () =>
      filteredTxs.map(tx => (
        <AccordionItem key={tx.tx_id} border={'none'} value={tx.tx_id}>
          <Flex gap={1.5} minWidth={0}>
            <Box minWidth={0} flex={1} overflow="hidden">
              <TxListItemMini tx={tx} />
            </Box>
            <AccordionItemTrigger
              flexGrow={0}
              flexShrink={0}
              width={'30px'}
              ml={'auto'}
              p={0}
              justifyContent={'center'}
              indicatorPlacement="end"
            />
          </Flex>
          <AccordionItemContent borderTopWidth="1px">
            <TxDetails tx={tx} />
          </AccordionItemContent>
        </AccordionItem>
      )),
    [filteredTxs]
  );

  return (
    <Section title={'Transactions'} topRight={<FilterButton />}>
      {pendingList}
      {filteredTxs?.length ? (
        <AccordionRoot multiple>{txList}</AccordionRoot>
      ) : hasTxButIsFiltered ? (
        <AllTransactionsFilteredMessage />
      ) : (
        <Stack flexGrow={1} alignItems="center" justifyContent="center">
          <Stack textAlign="center">
            <Title>No Transactions</Title>
            <Caption>Your list of transactions will display here.</Caption>
          </Stack>
        </Stack>
      )}
    </Section>
  );
}
