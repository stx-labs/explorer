import TransferIcon from '@/ui/icons/TransferIcon';
import { Fire, Lock, Question, Sparkle, TextAlignLeft } from '@phosphor-icons/react';

import { TransactionEvent, TransactionEventAssetType } from '@stacks/stacks-blockchain-api-types';

const EMPTY_VALUE = '-';

export function getFromAddress(event: TransactionEvent): string {
  if (event.event_type === 'stx_asset') {
    return event.asset.sender ?? EMPTY_VALUE;
  }
  if (event.event_type === 'fungible_token_asset') {
    return event.asset.sender ?? EMPTY_VALUE;
  }
  if (event.event_type === 'non_fungible_token_asset') {
    return event.asset.sender ?? EMPTY_VALUE;
  }

  return 'uncovered case';
}

export function getAmount(event: TransactionEvent): string | undefined {
  if (event.event_type === 'stx_asset') {
    return event.asset.amount;
  }
  if (event.event_type === 'fungible_token_asset') {
    return event.asset.amount;
  }
  if (event.event_type === 'non_fungible_token_asset') {
    return '1';
  }

  return undefined;
}

export function getToAddress(event: TransactionEvent): string {
  if (event.event_type === 'stx_asset') {
    return event.asset.recipient ?? EMPTY_VALUE;
  }
  if (event.event_type === 'fungible_token_asset') {
    return event.asset.recipient ?? EMPTY_VALUE;
  }
  if (event.event_type === 'non_fungible_token_asset') {
    return event.asset.recipient ?? EMPTY_VALUE;
  }

  return 'uncovered case';
}

export function getAssetType(event: TransactionEvent): string {
  if (event.event_type === 'smart_contract_log') {
    return 'Contract log';
  }
  if (event.event_type === 'stx_lock') {
    return 'STX lock';
  }
  if (event.event_type === 'stx_asset') {
    return 'STX token';
  }
  if (event.event_type === 'fungible_token_asset') {
    return 'Fungible token';
  }
  if (event.event_type === 'non_fungible_token_asset') {
    return 'Non fungible token';
  }
  return 'uncovered case';
}

export type ExtendedTransactionEventAssetType = TransactionEventAssetType | 'stx_lock' | 'print';

export function getAssetEventType(event: TransactionEvent): ExtendedTransactionEventAssetType {
  if ('asset' in event && event.asset.asset_event_type) {
    // covers TransactionEventFungibleAsset and TransactionEventNonFungibleAsset
    return event.asset.asset_event_type as TransactionEventAssetType;
  }
  if ('contract_log' in event) {
    // covers TransactionEventSmartContractLog
    return event.contract_log.topic as 'print';
  }
  if ('stx_lock' in event) {
    // covers TransactionEventSTXLock
    return 'stx_lock';
  }

  return EMPTY_VALUE as TransactionEventAssetType;
}

export function getAssetEventTypeLabel(assetEventType: ExtendedTransactionEventAssetType): string {
  if (assetEventType === 'mint') {
    return 'Mint';
  }
  if (assetEventType === 'burn') {
    return 'Burn';
  }
  if (assetEventType === 'transfer') {
    return 'Transfer';
  }
  if (assetEventType === 'stx_lock') {
    return 'STX lock';
  }
  if (assetEventType === 'print') {
    return 'Print';
  }
  return 'Unknown';
}

export function getAssetEventTypeIcon(
  assetEventType: ExtendedTransactionEventAssetType
): React.ReactNode {
  if (assetEventType === 'mint') {
    return <Sparkle />;
  }
  if (assetEventType === 'burn') {
    return <Fire />;
  }
  if (assetEventType === 'transfer') {
    return <TransferIcon />;
  }
  if (assetEventType === 'stx_lock') {
    return <Lock />;
  }
  if (assetEventType === 'print') {
    return <TextAlignLeft />;
  }
  return <Question />;
}

export function getAsset(event: TransactionEvent): string {
  if (event.event_type === 'smart_contract_log') {
    return EMPTY_VALUE; // could be the contract id
  }
  if (event.event_type === 'stx_asset') {
    return 'STX';
  }
  if (event.event_type === 'stx_lock') {
    return 'STX';
  }
  if ('asset' in event) {
    return event.asset.asset_id ?? EMPTY_VALUE;
  }

  return EMPTY_VALUE;
}
