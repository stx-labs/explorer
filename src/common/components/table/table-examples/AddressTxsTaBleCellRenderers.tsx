import { TxLink } from '@/common/components/ExplorerLinks';
import { TransactionStatus as TransactionStatusEnum } from '@/common/constants/constants';
import { getTransactionStatus, getTxTitle } from '@/common/utils/transactions';
import { Badge } from '@/ui/Badge';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Function } from '@phosphor-icons/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { EllipsisText } from '../CommonTableCellRenderers';
import { StatusTag } from './TxTableCellRenderers';

function getTxTypeIcon(principal: string, tx: Transaction | MempoolTransaction) {
  const txType = tx.tx_type;
  const txRecipient = txType === 'token_transfer' ? tx.token_transfer.recipient_address : undefined;
  const isIncomingTokenTransfer = txRecipient === principal;

  switch (txType) {
    case 'token_transfer':
      return isIncomingTokenTransfer ? <ArrowDownRight /> : <ArrowUpRight />;
    case 'smart_contract':
      return null;
    case 'contract_call':
      return <Function />;
    default:
      return null;
  }
}

export const TransactionTitleCellRenderer = (
  principal: string,
  tx: Transaction | MempoolTransaction
) => {
  const txStatus = getTransactionStatus(tx);
  const title = getTxTitle(tx);

  let content = (
    <Flex alignItems="center" gap={1}>
      <Icon h={3} w={3} color="iconPrimary">
        {getTxTypeIcon(principal, tx)}
      </Icon>
      <TxLink txId={tx.tx_id} variant="tableLink">
        <EllipsisText textStyle="text-medium-sm">{title}</EllipsisText>
      </TxLink>
    </Flex>
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

export const EventsCellRenderer = (numEvents: number, txId: string) => {
  return numEvents > 0 ? (
    <Badge variant="solid" type="tag" p={2} _groupHover={{ bg: 'surfaceTertiary' }}>
      <TxLink txId={txId} variant="noUnderline">
        <Flex alignItems="center" gap={1.5}>
          <EllipsisText textStyle="text-regular-xs" fontFamily="mono">
            {numEvents}
          </EllipsisText>
          <Icon h={2.5} w={2.5} color="iconSecondary">
            <ArrowRight weight="bold" />
          </Icon>
        </Flex>
      </TxLink>
    </Badge>
  ) : (
    <EllipsisText textStyle="text-regular-xs" fontFamily="mono">
      -
    </EllipsisText>
  );
};
