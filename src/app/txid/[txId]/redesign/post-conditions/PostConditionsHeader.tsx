import { SimpleTag } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import { Flex } from '@chakra-ui/react';

import { PostConditionMode } from '@stacks/stacks-blockchain-api-types';

const postConditionModeMap: Record<
  PostConditionMode | 'originator',
  { label: string; description: string }
> = {
  allow: {
    label: 'Allow mode',
    description:
      'The transaction must at least meet the listed post-conditions, but other transfers are allowed too.',
  },
  deny: {
    label: 'Deny mode',
    description:
      'Only the post-conditions explicitly listed are allowed. Anything not listed will cause the transaction to fail.',
  },
  originator: {
    label: 'Originator mode',
    description:
      'Asset transfers from the transaction sender must be covered by the listed post-conditions. Transfers between other accounts, such as contracts, are allowed without restriction.',
  },
};

export function PostConditionsHeader({
  postConditionMode,
}: {
  postConditionMode: PostConditionMode | 'originator';
}) {
  // A mode the API adds before the explorer knows it should not take down the
  // whole transaction page
  const { label, description } = postConditionModeMap[postConditionMode] ?? {
    label: postConditionMode,
    description: 'This transaction uses a post-condition mode the explorer does not recognize yet.',
  };
  return (
    <Flex
      gap={2.5}
      flexDirection={{ base: 'column', md: 'row' }}
      alignItems={{ base: 'flex-start', md: 'center' }}
    >
      <SimpleTag
        label={label}
        bg="surfaceFifth"
        labelProps={{
          fontFamily: 'var(--stacks-fonts-instrument-sans)',
          textStyle: 'text-medium-xs',
        }}
      />
      <Text textStyle="text-regular-sm" color="textSecondary">
        {description}
      </Text>
    </Flex>
  );
}
