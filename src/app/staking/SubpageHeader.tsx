'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

/**
 * Title block for the pages that hang off /staking.
 *
 * The back link is the explorer's ButtonLink pointed backwards, and the title
 * is the heading the other list pages (blocks, transactions) use, so moving
 * between them never changes the size of the page title.
 */
export function SubpageHeader({ title }: { title: string }) {
  const network = useGlobalContext().activeNetwork;
  return (
    <Stack gap={3}>
      <ButtonLink
        href={buildUrl('/staking', network)}
        buttonLinkSize="big"
        buttonLinkDirection="backward"
      >
        Staking
      </ButtonLink>
      <Text textStyle="heading-md" color="textPrimary">
        {title}
      </Text>
    </Stack>
  );
}
