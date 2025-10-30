import { Stack } from '@chakra-ui/react';

import { TokenIdHeader } from './redesign/TokenIdHeader';
import { TokenIdTabs } from './redesign/TokenIdTabs';

export default function TokenIdPageRedesign() {
  return (
    <Stack gap={8}>
      <TokenIdHeader />
      <TokenIdTabs />
    </Stack>
  );
}
