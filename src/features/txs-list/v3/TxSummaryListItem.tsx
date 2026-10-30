'use client';

import { Box, Flex, FlexProps, HStack, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { FC, memo, useEffect, useState } from 'react';

import { TxLink } from '../../../common/components/ExplorerLinks';
import { TwoColsListItem } from '../../../common/components/TwoColumnsListItem';
import { TxIcon } from '../../../common/components/TxIcon';
import { PrincipalLink } from '../../../common/components/transaction-item';
import { TransactionSummary } from '../../../common/types/tx-v3';
import {
  MICROSTACKS_IN_STACKS,
  getContractName,
  microToStacksFormatted,
  toRelativeTime,
  truncateMiddleDeprecated,
} from '../../../common/utils/utils';
import { Text } from '../../../ui/Text';
import { Tooltip } from '../../../ui/Tooltip';
import { Caption } from '../../../ui/typography';
import { getTransactionTypeLabel, getV3TxStatus } from '../utils';
import { V3StxPrice } from './V3StxPrice';

interface TxSummaryListItemProps extends FlexProps {
  tx: TransactionSummary;
}

const TxSummaryIcon: FC<{ tx: TransactionSummary }> = memo(({ tx }) => (
  <TxIcon txType={tx.type} txStatus={getV3TxStatus(tx.status)} />
));

const TxSummaryTitle: FC<{ tx: TransactionSummary }> = ({ tx }) => {
  switch (tx.type) {
    case 'smart_contract':
      return <TxLink txId={tx.tx_id}>{getContractName(tx.smart_contract.contract_id)}</TxLink>;
    case 'contract_call':
      return (
        <Flex height="full" alignItems="center" whiteSpace="nowrap">
          <TxLink txId={tx.tx_id} fontSize="md" fontWeight="medium">
            {tx.contract_call.function_name}
          </TxLink>
          &nbsp;
          <Box color="textSubdued" display="inline">
            (
            <TxLink
              txId={tx.contract_call.contract_id}
              overflow={'none'}
              fontSize="sm"
              fontWeight="medium"
            >
              {getContractName(tx.contract_call.contract_id)}
            </TxLink>
            )
          </Box>
        </Flex>
      );
    case 'token_transfer':
      if (tx.block.height === 1) {
        return <TxLink txId={tx.tx_id}>Stacks 2.0 genesis transfer</TxLink>;
      }
      return (
        <Flex flexDirection={['row']} alignItems={['center']}>
          <TxLink txId={tx.tx_id}>{microToStacksFormatted(tx.token_transfer.amount)} STX</TxLink>
          <V3StxPrice
            value={Number(tx.token_transfer.amount)}
            bitcoinBlockTime={tx.bitcoin_block.time}
          />
        </Flex>
      );
    case 'tenure_change':
      return <TxLink txId={tx.tx_id}>Tenure change</TxLink>;
    case 'coinbase':
      return <TxLink txId={tx.tx_id}>Block #{tx.block.height}</TxLink>;
    default:
      return <TxLink txId={tx.tx_id}>{tx.tx_id}</TxLink>;
  }
};

const TxSummaryAddressArea: FC<{ tx: TransactionSummary }> = memo(({ tx }) => {
  switch (tx.type) {
    case 'token_transfer':
      return (
        <HStack flexWrap="nowrap" whiteSpace="nowrap">
          <PrincipalLink principal={tx.sender.address} />
          <Flex as="span">
            <Icon h={3} w={3} aria-label="to">
              <ArrowRight />
            </Icon>
          </Flex>
          <PrincipalLink principal={tx.token_transfer.recipient} />
        </HStack>
      );
    case 'contract_call':
    case 'smart_contract':
      return (
        <Caption whiteSpace="nowrap">
          By <PrincipalLink principal={tx.sender.address} />
        </Caption>
      );
    case 'coinbase':
      return (
        <Caption whiteSpace="nowrap">
          Mined by <PrincipalLink principal={tx.sender.address} />
        </Caption>
      );
    case 'tenure_change':
      return <Caption whiteSpace="nowrap">Cause: {tx.tenure_change.cause}</Caption>;
    default:
      return null;
  }
});

const TxSummaryTimestamp: FC<{ tx: TransactionSummary }> = ({ tx }) => {
  const blockTime = tx.block.time;
  const [relativeTimestamp, setRelativeTimestamp] = useState('');
  const dateString = blockTime ? new Date(blockTime * 1000).toUTCString() : '';

  useEffect(() => {
    setRelativeTimestamp(blockTime ? toRelativeTime(blockTime * 1000) : '');
  }, [blockTime]);

  return (
    <Tooltip content={dateString}>
      <Box suppressHydrationWarning>{relativeTimestamp}</Box>
    </Tooltip>
  );
};

const LeftTitle: FC<{ tx: TransactionSummary }> = memo(({ tx }) => (
  <Text whiteSpace="nowrap" height={6}>
    <TxSummaryTitle tx={tx} />
  </Text>
));

const LeftSubtitle: FC<{ tx: TransactionSummary }> = memo(({ tx }) => (
  <Stack
    as="span"
    direction={['column', 'column', 'row', 'row', 'row']}
    separator={
      <Caption
        border="none"
        className="separator"
        display={['none', 'none', 'inline', 'inline', 'inline']}
      >
        ∙
      </Caption>
    }
    flexWrap="wrap"
    gap={1.5}
  >
    <Caption fontWeight="semibold">{getTransactionTypeLabel(tx.type)}</Caption>
    <TxSummaryAddressArea tx={tx} />
    {Number(tx.fee_rate) > 0 ? (
      <Caption whiteSpace="nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
        Fee: {`${(Number(tx.fee_rate) / MICROSTACKS_IN_STACKS).toFixed(4)} STX`}
      </Caption>
    ) : null}
  </Stack>
));

const RightTitle: FC<{ tx: TransactionSummary }> = memo(({ tx }) => (
  <Stack
    as="span"
    direction={['column', 'column', 'row', 'row', 'row']}
    separator={
      <Caption border="none" display={['none', 'none', 'inline', 'inline', 'inline']}>
        ∙
      </Caption>
    }
    flexWrap="wrap"
    gap={1.5}
    alignItems={['normal', 'normal', 'center', 'center', 'center']}
    height={['auto', 'auto', '6', '6', '6']}
  >
    <TxLink txId={tx.tx_id}>{truncateMiddleDeprecated(tx.tx_id)}</TxLink>
    <TxSummaryTimestamp tx={tx} />
  </Stack>
));

const RightSubtitle: FC<{ tx: TransactionSummary }> = memo(({ tx }) => {
  const didFail = tx.status !== 'success';
  return (
    <Stack
      as="span"
      gap={1.5}
      direction={['column', 'column', 'row', 'row', 'row']}
      separator={
        <Caption border="none" display={['none', 'none', 'inline', 'inline', 'inline']}>
          ∙
        </Caption>
      }
      flexWrap="wrap"
    >
      {didFail ? (
        <Caption data-test="tx-caption" color="error" whiteSpace="nowrap">
          Failed
        </Caption>
      ) : (
        <Stack
          as="span"
          direction={['column', 'column', 'row', 'row', 'row']}
          separator={
            <Caption border="none" display={['none', 'none', 'inline', 'inline', 'inline']}>
              ∙
            </Caption>
          }
          flexWrap="wrap"
          gap={1.5}
        >
          <Caption whiteSpace="nowrap">Block #{tx.block.height}</Caption>
          <Caption as="span" whiteSpace="nowrap">
            Nonce: {tx.sender.nonce}
          </Caption>
        </Stack>
      )}
    </Stack>
  );
});

export const TxSummaryListItem: FC<TxSummaryListItemProps> = memo(({ tx, ...rest }) => (
  <TwoColsListItem
    icon={<TxSummaryIcon tx={tx} />}
    leftContent={{
      title: <LeftTitle tx={tx} />,
      subtitle: <LeftSubtitle tx={tx} />,
    }}
    rightContent={{
      title: <RightTitle tx={tx} />,
      subtitle: <RightSubtitle tx={tx} />,
    }}
    {...rest}
  />
));
