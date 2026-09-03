'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

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
