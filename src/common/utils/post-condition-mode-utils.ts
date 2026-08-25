import { PostConditionMode, PostConditionModeName } from '@stacks/transactions';

export const postConditionModeNames: Record<PostConditionMode, PostConditionModeName> = {
  [PostConditionMode.Allow]: 'allow',
  [PostConditionMode.Originator]: 'originator',
  [PostConditionMode.Deny]: 'deny',
};

const postConditionModeByName: Record<PostConditionModeName, PostConditionMode> = {
  allow: PostConditionMode.Allow,
  originator: PostConditionMode.Originator,
  deny: PostConditionMode.Deny,
};

export function postConditionModeFromName(name: string | undefined): PostConditionMode | undefined {
  return name != null && Object.hasOwn(postConditionModeByName, name)
    ? postConditionModeByName[name as PostConditionModeName]
    : undefined;
}

export const postConditionModeOptions: { value: PostConditionModeName; label: string }[] = [
  { value: 'allow', label: 'Allow mode' },
  { value: 'originator', label: 'Originator mode' },
  { value: 'deny', label: 'Deny mode' },
];

export const postConditionModeDescriptions: Record<PostConditionMode, string> = {
  [PostConditionMode.Allow]:
    'The post-conditions listed below are still enforced, but transfers they do not cover are permitted too. It is the least restrictive mode.',
  [PostConditionMode.Originator]:
    'Originator mode requires every asset transfer out of your account to be covered by a post-condition listed below. Transfers between other accounts, such as contracts, are unrestricted.',
  [PostConditionMode.Deny]:
    'Deny mode only permits the asset transfers explicitly listed in the post-conditions below. Any transfer that is not listed will cause the transaction to fail.',
};
