import { PostCondition } from '@stacks/stacks-blockchain-api-types';

export function getAmount(postCondition: PostCondition): string {
  if (postCondition.type === 'stx') {
    return postCondition.amount || '';
  }
  if (postCondition.type === 'fungible') {
    return postCondition.amount || '';
  }
  if (postCondition.type === 'non_fungible') {
    return '1';
  }

  return '';
}
