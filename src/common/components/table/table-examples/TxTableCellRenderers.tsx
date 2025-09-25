import { TxLink } from '@/common/components/ExplorerLinks';
import { TransactionStatus as TransactionStatusEnum } from '@/common/constants/constants';
import { getTransactionStatus, getTxTitle } from '@/common/utils/transactions';
import { formatStacksAmount, microToStacksFormatted, truncateHex } from '@/common/utils/utils';
import { TransactionTypeBadge } from '@/ui/Badge';
import { Tooltip } from '@/ui/Tooltip';
import MicroStxIcon from '@/ui/icons/MicroStxIcon';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon } from '@chakra-ui/react';
import { Clock, Question, XCircle } from '@phosphor-icons/react';

import {
  MempoolTransaction,
  MempoolTransactionStatus,
  Transaction,
  TransactionStatus,
} from '@stacks/stacks-blockchain-api-types';

import { EllipsisText } from '../CommonTableCellRenderers';

export const TxTypeCellRenderer = ({ txType }: { txType: string }) => {
  return <TransactionTypeBadge tx={{ tx_type: txType } as Transaction} />;
};

export const TxLinkCellRenderer = (value: string) => {
  return (
    <TxLink txId={value} variant="tableLink">
      <EllipsisText>{truncateHex(value, 4, 5, false)}</EllipsisText>
    </TxLink>
  );
};

export const FeeCellRenderer = (value: string) => {
  // TODO: Make this a common cell renderer after merging the function called tab PR
  const stx = microToStacksFormatted(value);
  const microStx = formatStacksAmount(value);

  return (
    <Flex alignItems="center" gap={1}>
      <Icon h={3} w={3} color="textSecondary">
        {stx.length > microStx.length ? <MicroStxIcon /> : <StacksIconThin />}
      </Icon>
      <EllipsisText fontSize="sm">
        {stx.length > microStx.length ? `${microStx} µSTX` : `${stx} STX`}
      </EllipsisText>
    </Flex>
  );
};

export const AmountCellRenderer = (value: number) => {
  return (
    <Flex alignItems="center" gap={1}>
      <Icon h={3} w={3} color="textSecondary">
        <StacksIconThin />
      </Icon>
      <EllipsisText fontSize="sm">{value} STX</EllipsisText>
    </Flex>
  );
};

export const TimeStampCellRenderer = (value: string, tooltip?: string) => {
  const content = (
    <Flex
      alignItems="center"
      bg="surfacePrimary"
      borderRadius="md"
      py={0.5}
      px={1}
      w="fit-content"
      _groupHover={{
        bg: 'surfaceTertiary',
      }}
    >
      <EllipsisText
        fontSize="xs"
        fontFamily="var(--font-matter-mono)"
        suppressHydrationWarning={true}
      >
        {value}
      </EllipsisText>
    </Flex>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} variant="redesignPrimary">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export const IconCellRenderer = (value: React.ReactNode) => {
  return (
    <Icon h={3} w={3} color="textSecondary">
      {value}
    </Icon>
  );
};

function getTxStatusIcon(status: TransactionStatus | MempoolTransactionStatus) {
  switch (status) {
    case 'pending':
      return <Clock />;
    case 'abort_by_post_condition':
      return <XCircle />;
    case 'abort_by_response':
      return <XCircle />;
    default:
      return <Question />;
  }
}

function getTxStatusIconColor(status: TransactionStatus | MempoolTransactionStatus) {
  switch (status) {
    case 'pending':
      return 'transactionStatus.pending';
    case 'abort_by_post_condition':
      return 'feedback.red-600';
    case 'abort_by_response':
      return 'feedback.red-600';
    default:
      return 'iconSecondary';
  }
}

function getTxStatusBgColor(status: TransactionStatus | MempoolTransactionStatus) {
  switch (status) {
    case 'pending':
      return 'transactionStatus.pending';
    case 'abort_by_post_condition':
      return 'transactionStatus.failed';
    case 'abort_by_response':
      return 'transactionStatus.failed';
    default:
      return 'surfaceSecondary';
  }
}

export const StatusTag = ({ status }: { status: TransactionStatus | MempoolTransactionStatus }) => {
  return (
    <Flex
      alignItems="center"
      gap={1}
      px={1.5}
      py={1}
      bg={getTxStatusBgColor(status)}
      borderRadius="redesign.md"
    >
      <Icon h={3} w={3} color={getTxStatusIconColor(status)}>
        {getTxStatusIcon(status)}
      </Icon>
    </Flex>
  );
};

export const TransactionTitleCellRenderer = (tx: Transaction | MempoolTransaction) => {
  const txStatus = getTransactionStatus(tx);
  const title = getTxTitle(tx);

  let content = (
    <TxLink txId={tx.tx_id} variant="tableLink">
      <EllipsisText textStyle="text-medium-sm">{title}</EllipsisText>
    </TxLink>
  );

  if (
    tx.tx_status &&
    (txStatus === TransactionStatusEnum.FAILED || txStatus === TransactionStatusEnum.PENDING)
  ) {
    return (
      <Flex alignItems="center" gap={1.5}>
        {content}
        <StatusTag status={tx.tx_status} />
      </Flex>
    );
  }

  return content;
};
