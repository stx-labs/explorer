import { Stack } from '@chakra-ui/react';

import { TokenAlert } from './redesign/TokenAlert';
import { TokenIdHeader } from './redesign/TokenIdHeader';
import { TokenIdTabs } from './redesign/TokenIdTabs';

export default function TokenIdPageRedesign() {
  return (
    <Stack gap={8}>
      <TokenIdHeader />
      <TokenAlert />
      <TokenIdTabs />
    </Stack>
  );
}
 