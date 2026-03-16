import { Box, Flex } from '@chakra-ui/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { TxLink } from '../../common/components/ExplorerLinks';
import { StxPrice } from '../../common/components/StxPrice';
import { isConfirmedTx } from '../../common/utils/transactions';
import { getContractName, getFunctionName, microToStacksFormatted } from '../../common/utils/utils';

export const TxTitle = ({
  tx,
  showPrice,
  openInNewTab,
}: {
  tx: Transaction | MempoolTransaction;
  showPrice?: boolean;
  openInNewTab?: boolean;
}) => {
  switch (tx.tx_type) {
    case 'smart_contract':
      return (
        <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
          {getContractName(tx?.smart_contract?.contract_id)}
        </TxLink>
      );
    case 'contract_call':
      return (
        <Flex height="full" alignItems="center" whiteSpace="nowrap">
          <TxLink txId={tx.tx_id} openInNewTab={openInNewTab} fontSize="md" fontWeight="medium">
            {getFunctionName(tx)}
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
      if (isConfirmedTx(tx) && tx.block_height === 1) {
        return (
          <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
            Stacks 2.0 genesis transfer
          </TxLink>
        );
      }
      return (
        <Flex flexDirection={['row']} alignItems={['center']}>
          <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
            {microToStacksFormatted(tx.token_transfer.amount)} STX
          </TxLink>
          {showPrice && <StxPrice tx={tx} value={Number(tx.token_transfer.amount)} />}
        </Flex>
      );
    case 'tenure_change':
      return (
        <Flex flexDirection={['row']} alignItems={['center']}>
          <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
            Tenure change
          </TxLink>
        </Flex>
      );
    case 'coinbase':
      return (
        <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
          Block #{(tx as Transaction).block_height}
        </TxLink>
      );
    default:
      return (
        <TxLink txId={tx.tx_id} openInNewTab={openInNewTab}>
          {tx.tx_id}
        </TxLink>
      );
  }
};
