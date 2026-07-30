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

export type PostConditionWithStaking = PostCondition | StakingPostCondition;

type PostConditionNonFungibleConditionCode = Extract<
  Transaction['post_conditions'][number],
  { type: 'non_fungible' }
>['condition_code'];

export type PostConditionConditionCode =
  | PostConditionFungibleConditionCode
  | PostConditionNonFungibleConditionCode;

export function getAmount(postCondition: PostConditionWithStaking): string {
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

export function getPostConditionCellText(
  postConditionCode: PostConditionConditionCode,
  postConditionType: PostConditionWithStaking['type']
): string {
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
