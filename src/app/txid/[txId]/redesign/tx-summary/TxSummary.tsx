import { Table } from '@chakra-ui/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { CoinbaseTxSummaryItems } from './CoinbaseTxSummary';
import { ContractCallTxSummaryItems } from './ContractCallTxSummary';
import { SmartContractTxSummaryItems } from './SmartContractTxSummary';
import { TenureChangeTxSummaryItems } from './TenureChangeTxSummary';
import { TokenTransferTxSummaryItems } from './TokenTransferTxSummary';

export function TxSummary({ tx }: { tx: Transaction | MempoolTransaction }) {
  let summaryContent;
  if (tx.tx_type === 'coinbase') summaryContent = <CoinbaseTxSummaryItems tx={tx} />;
  if (tx.tx_type === 'token_transfer') summaryContent = <TokenTransferTxSummaryItems tx={tx} />;
  if (tx.tx_type === 'contract_call') summaryContent = <ContractCallTxSummaryItems tx={tx} />;
  if (tx.tx_type === 'smart_contract') summaryContent = <SmartContractTxSummaryItems tx={tx} />;
  if (tx.tx_type === 'tenure_change') summaryContent = <TenureChangeTxSummaryItems tx={tx} />;

  return (
    <Table.Root w="full">
      <Table.Body>{summaryContent}</Table.Body>
    </Table.Root>
  );
}
