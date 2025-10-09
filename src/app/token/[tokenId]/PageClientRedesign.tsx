import { Box, Stack } from '@chakra-ui/react';

import { useTokenIdPageData } from './redesign/context/TokenIdPageContext';

export default function TokenIdPageRedesign() {
  const { tokenId, tokenData, stxPrice, initialAddressRecentTransactionsData, btcPrice } =
    useTokenIdPageData();
  console.log({ tokenData, tokenId, stxPrice, btcPrice, initialAddressRecentTransactionsData });
  return (
    <Stack gap={8}>
      <Box>Redesign Placeholder</Box>
    </Stack>
  );
}
