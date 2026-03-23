'use client';

import { Box, Flex, FlexProps, HStack, Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import * as React from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { Tooltip } from '../../ui/Tooltip';
import { Caption, TextProps } from '../../ui/typography';
import { toRelativeTime, truncateMiddleDeprecated } from '../utils/utils';
import { ExplorerLink } from './ExplorerLinks';

export interface TxItemProps extends FlexProps {
  tx: Transaction | MempoolTransaction;
  minimal?: boolean;
  isFocused?: boolean;
  target?: string;
  principal?: string;
  onClick?: any;
  onFocus?: any;
  onBlur?: any;
  tabIndex?: any;
  hideIcon?: boolean;
  hideRightElements?: boolean;
}

const getTransactionTime = (tx: Transaction | MempoolTransaction) => {
  if (
    (tx as any).block_time &&
    typeof (tx as any).block_time !== 'undefined' &&
    (tx as any).block_time !== -1
  ) {
    return (tx as any).block_time;
  }
  if (
    (tx as any).burn_block_time &&
    typeof (tx as any).burn_block_time !== 'undefined' &&
    (tx as any).burn_block_time !== -1
  ) {
    return (tx as any).burn_block_time;
  } else if ((tx as any).burn_block_time === -1) {
    return (tx as any).parent_burn_block_time;
  } else if ((tx as any).receipt_time) {
    return (tx as any).receipt_time;
  }
  return null;
};

const getRelativeTimestamp = (tx: Transaction | MempoolTransaction) => {
  const txTime = getTransactionTime(tx);
  const date = txTime ? toRelativeTime(txTime * 1000) : 'Pending...';
  return date;
};

export const PrincipalLink: React.FC<FlexProps & { principal: string }> = ({
  principal,
  ...rest
}) => (
  <Flex display="inline-flex" position={'relative'} as="span" {...rest}>
    <ExplorerLink href={`/address/${encodeURIComponent(principal)}`}>
      <Caption
        _hover={{
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
        textDecoration="none"
      >
        {truncateMiddleDeprecated(principal)}
      </Caption>
    </ExplorerLink>
  </Flex>
);

export const AddressArea = React.memo(
  ({ tx, principal }: { tx: Transaction | MempoolTransaction; principal?: string } & FlexProps) => {
    if (tx.tx_type === 'token_transfer') {
      if (tx.sender_address === principal) {
        return (
          <HStack flexWrap="nowrap" whiteSpace="nowrap">
            <Caption display={['none', 'none', 'none', 'block']}>Sent to</Caption>
            <PrincipalLink principal={tx.token_transfer.recipient_address} />
          </HStack>
        );
      } else if (tx.token_transfer.recipient_address === principal) {
        return (
          <HStack flexWrap="nowrap" whiteSpace="nowrap">
            <Caption display={['none', 'none', 'none', 'block']}>Received from</Caption>
            <PrincipalLink principal={tx.sender_address} />
          </HStack>
        );
      }
      return (
        <HStack flexWrap="nowrap" whiteSpace="nowrap">
          <PrincipalLink principal={tx.sender_address} />
          <Flex as="span">
            <Icon h={3} w={3}>
              <ArrowRight />
            </Icon>
          </Flex>
          <PrincipalLink principal={tx.token_transfer.recipient_address} />
        </HStack>
      );
    }
    if (tx.tx_type === 'contract_call') {
      return (
        <Caption whiteSpace="nowrap">
          By <PrincipalLink principal={tx.sender_address} />
        </Caption>
      );
    }
    if (tx.tx_type === 'smart_contract') {
      return (
        <Caption whiteSpace="nowrap">
          By <PrincipalLink principal={tx.sender_address} />
        </Caption>
      );
    }
    if (tx.tx_type === 'coinbase') {
      return (
        <Caption whiteSpace="nowrap">
          Mined by <PrincipalLink principal={tx.sender_address} />
        </Caption>
      );
    }
    if (tx.tx_type === 'tenure_change') {
      return <Caption whiteSpace="nowrap">Cause: {tx.tenure_change_payload?.cause}</Caption>;
    }
    return null;
  }
);

export const TxTimestamp = ({ tx }: { tx: Transaction | MempoolTransaction }) => {
  const txTime = getTransactionTime(tx);
  const [relativeTimestamp, setRelativeTimestamp] = React.useState('');
  const dateString = txTime ? new Date(txTime * 1000).toUTCString() : '';

  React.useEffect(() => {
    setRelativeTimestamp(getRelativeTimestamp(tx));
  }, [tx]);

  return (
    <Tooltip content={dateString}>
      <Box suppressHydrationWarning>{relativeTimestamp}</Box>
    </Tooltip>
  );
};

export function Nonce({ nonceVal, ...rest }: TextProps & { nonceVal: number }) {
  return (
    <Caption as="span" {...rest}>
      Nonce: {nonceVal.toString()}
    </Caption>
  );
}
