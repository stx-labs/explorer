import type { Transaction } from '@stacks/blockchain-api-client';
import {
  PostCondition,
  PostConditionFungibleConditionCode,
  PostConditionPrincipal,
} from '@stacks/stacks-blockchain-api-types';

// pox-5 staking transactions carry a `staking` post-condition type that
// @stacks/stacks-blockchain-api-types doesn't include yet. Unlike the other
// types it has no `asset` field; the amount is in micro-STX.
export interface StakingPostCondition {
  type: 'staking';
  principal: PostConditionPrincipal;
  condition_code: PostConditionFungibleConditionCode;
  amount: string;
}

export type PoxPostConditionConditionCode = 'not_performed' | 'maybe_performed' | 'performed';

// pox-5 also adds a `pox` post-condition covering PoX actions that don't change
// locking status (unstake, update-bond-registration, ...). It carries neither an
// asset nor an amount, only whether the action may happen.
export interface PoxPostCondition {
  type: 'pox';
  principal: PostConditionPrincipal;
  condition_code: PoxPostConditionConditionCode;
}

export type ExtendedPostCondition = PostCondition | StakingPostCondition | PoxPostCondition;

type PostConditionNonFungibleConditionCode = Extract<
  Transaction['post_conditions'][number],
  { type: 'non_fungible' }
>['condition_code'];

export type PostConditionConditionCode =
  | PostConditionFungibleConditionCode
  | PostConditionNonFungibleConditionCode
  | PoxPostConditionConditionCode;

export function getAmount(postCondition: ExtendedPostCondition): string {
  if (postCondition.type === 'stx') {
    return postCondition.amount || '';
  }
  if (postCondition.type === 'fungible') {
    return postCondition.amount || '';
  }
  if (postCondition.type === 'non_fungible') {
    return '1';
  }
  if (postCondition.type === 'staking') {
    return postCondition.amount || '';
  }

  return '';
}

function getPoxPostConditionCellText(postConditionCode: PostConditionConditionCode): string {
  if (postConditionCode === 'not_performed') {
    return 'Must not perform PoX action';
  }
  if (postConditionCode === 'maybe_performed') {
    return 'May perform PoX action';
  }
  if (postConditionCode === 'performed') {
    return 'Must perform PoX action';
  }
  return 'Undefined post condition code';
}

export function getPostConditionCellText(
  postConditionCode: PostConditionConditionCode,
  postConditionType: ExtendedPostCondition['type']
): string {
  if (postConditionType === 'pox') {
    return getPoxPostConditionCellText(postConditionCode);
  }

  const verb = postConditionType === 'staking' ? 'stake' : 'transfer';
  const verbThirdPerson = postConditionType === 'staking' ? 'Stakes' : 'Transfers';
  if (postConditionCode === 'sent_equal_to') {
    return `${verbThirdPerson} exactly`;
  }
  if (postConditionCode === 'sent_greater_than') {
    return `${verbThirdPerson} more than`;
  }
  if (postConditionCode === 'sent_greater_than_or_equal_to') {
    return `${verbThirdPerson} at least`;
  }
  if (postConditionCode === 'sent_less_than') {
    return `${verbThirdPerson} less than`;
  }
  if (postConditionCode === 'sent_less_than_or_equal_to') {
    return `${verbThirdPerson} at most`;
  }
  if (postConditionCode === 'sent') {
    return `Must ${verb}`;
  }
  if (postConditionCode === 'not_sent') {
    return `Must not ${verb}`;
  }
  if (postConditionCode === 'maybe_sent') {
    return `May ${verb}`;
  }
  return 'Undefined post condition code';
}
