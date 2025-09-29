import { TransactionStatus as TransactionStatusEnum } from '@/common/constants/constants';
import { getTransactionStatus } from '@/common/utils/transactions';
import { Alert } from '@/components/ui/alert';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { Clock, Question, WarningDiamond, XCircle } from '@phosphor-icons/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

export type AlertStatus = 'neutral' | 'warning' | 'error' | 'info';

export function getAlertIcon(status: AlertStatus) {
  switch (status) {
    case 'error':
      return <XCircle weight="bold" />;
    case 'warning':
      return <Clock weight="bold" />;
    case 'neutral':
      return <Question weight="bold" />;
    case 'info':
      return <WarningDiamond weight="bold" />;
  }
}

export function PendingAlert() {
  return (
    <Alert
      status="warning"
      title="Transaction taking longer than usual"
      description="Some transactions may be delayed if the tenure budget is full. A tenure budget refers to the limit on the number of tenures (periods during which a miner can produce blocks) that a miner can hold within a specific timeframe. If the tenure budget is full, it means the miner has reached the maximum number of tenures they can hold, potentially delaying the assignment of new tenures and affecting block production or transaction processing times."
    />
  );
}

export function TransactionDroppedAlert() {
  return (
    <Alert
      status="error"
      title="Transaction dropped"
      description="This transaction was dropped because it could not be mined. Dropped transactions do not incur mining fees and will expire after 256 tenures (~42 hours). Although they do not become part of the blockchain history, some indexers may continue to display data for these transactions for a limited time after expiration."
    />
  );
}

export function TransactionRolledBackAlert() {
  return (
    <Alert
      status="error"
      title="Transaction rolled back"
      description="This transaction would have succeeded but was rolled back due to a supplied post-condition. While a failed transaction is included in a block (with mining fees paid to the miner and non-refundable), it failed because it violated the rules of the Stacks protocol or the smart contract it interacted with. Refer to the error code and/or the contract for more details on the specific cause of failure."
    />
  );
}

export function TenureAlert() {
  return (
    <Alert
      status="neutral"
      description={
        <Text>
          A tenure is the period during which an individual miner is authorized to produce new
          blocks for the Stacks blockchain. Tenures change roughly every Bitcoin block when new
          miners are randomly elected, with Signers validating tenure changes or extensions to
          ensure secure transitions.{' '}
          <Link
            href="https://www.hiro.so/blog/understanding-nakamotos-fast-blocks-on-stacks"
            target="_blank"
            textDecorationColor="textPrimary"
          >
            Learn more
          </Link>
          .
        </Text>
      }
    />
  );
}

export function NonCanonicalAlert() {
  return (
    <Alert
      status="warning"
      description="This transaction is in a non-canonical fork. It is not in the canonical Stacks chain"
    />
  );
}

export function getFailureDescription(tx: Transaction | MempoolTransaction) {
  const reasonForFailure =
    tx.tx_status === 'abort_by_response'
      ? 'This transaction did not succeed because the transaction was aborted during its execution'
      : tx.tx_status === 'abort_by_post_condition'
        ? 'This transaction would have succeeded, but was rolled back by a supplied post-condition'
        : undefined;
  const vmError =
    'vm_error' in tx && tx.vm_error && typeof tx.vm_error === 'string' ? tx.vm_error : undefined;

  return (
    <Stack gap={1}>
      <Text textStyle="text-regular-xs" color="textPrimary">
        {reasonForFailure}. A failed transaction is included in a block (mining fees are paid to the
        miner and are non-refundable), but failed because it violated the rules of the Stacks
        protocol or of the smart contract it interacted with. See the error code and/or the contract
        to learn more about the specific cause of failure.
      </Text>
      <Text textStyle="text-regular-xs" color="textPrimary"></Text>
      {vmError && (
        <Text textStyle="text-regular-xs" color="textPrimary">
          VM Error: {vmError}
        </Text>
      )}
    </Stack>
  );
}

export function TransactionFailedAlert({ tx }: { tx: Transaction | MempoolTransaction }) {
  const failureDescription = getFailureDescription(tx);
  return <Alert status="error" title="Transaction failed" description={failureDescription} />;
}

export function getTxAlert(tx: Transaction | MempoolTransaction) {
  const txType = tx.tx_type;
  const txStatus = getTransactionStatus(tx);

  let alertContent;

  switch (txStatus) {
    case TransactionStatusEnum.Pending:
      alertContent = <PendingAlert />;
      break;
    case TransactionStatusEnum.Dropped:
      alertContent = <TransactionDroppedAlert />;
      break;
    case TransactionStatusEnum.RolledBack:
      alertContent = <TransactionRolledBackAlert />;
      break;
    case TransactionStatusEnum.FAILED:
      alertContent = <TransactionFailedAlert tx={tx} />;
      break;
    case TransactionStatusEnum.NON_CANONICAL:
      alertContent = <NonCanonicalAlert />;
      break;
    default:
      alertContent = null;
      break;
  }

  if (txType === 'tenure_change') {
    alertContent = (
      <Stack gap={2}>
        <TenureAlert />
        {alertContent}
      </Stack>
    );
  }

  return alertContent;
}

export function TokenAlert({ tokenId }: { tokenId: string }) {
  const txType = tx.tx_type;
  const txStatus = getTransactionStatus(tx);

  const isSuspicious = true;

  if (isSuspicious) {
    return <SuspiciousTokenAlert />;
  }

  return alertContent;
}

export function SuspiciousTokenAlert() {
  return (
    <Alert
      status="error"
      title="Unknown or newly issued token"
      description={
        'This token appears to be a misrepresentation or is associated with suspicious activity. Investing in unknown or new crypto tokens carries high risk and may result in total loss. Do your own research, as these tokens can be volatile and lack transparency. Ensure you fully trust the token or entity before interacting with it.'
      }
    />
  );
}

export function SimilarTokenAlert() {
  return (
    <Alert
      status="error"
      title="Unknown or newly issued token"
      description={
        'This token appears to be a misrepresentation or is associated with suspicious activity. Investing in unknown or new crypto tokens carries high risk and may result in total loss. Do your own research, as these tokens can be volatile and lack transparency. Ensure you fully trust the token or entity before interacting with it.'
      }
      alertBg="colors.feedback.yellow-200"
      alertIconColor="colors.feedback.yellow-700"
    />
  );
}
