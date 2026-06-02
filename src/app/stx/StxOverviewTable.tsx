'use client';

import { useTokenIdPageData } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { SummaryItem } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { SimpleTag } from '@/ui/Badge';
import { Table } from '@chakra-ui/react';

import { STX_NAME, STX_SYMBOL } from './consts';

export const StxOverviewTable = () => {
  const { tokenData } = useTokenIdPageData();

  const tokenName = tokenData?.name || STX_NAME;
  const tokenSymbol = tokenData?.symbol || STX_SYMBOL;

  return (
    <Table.Root w="full" h="fit-content">
      <Table.Body h="fit-content">
        <SummaryItem label="Coin name" value={tokenName} showCopyButton />
        <SummaryItem
          label="Ticker"
          value={tokenSymbol}
          valueRenderer={value => (
            <SimpleTag label={value} _groupHover={{ bg: 'surfaceTertiary' }} />
          )}
          showCopyButton
        />
        <SummaryItem
          label="Asset type"
          value="Native"
          valueRenderer={value => (
            <SimpleTag label={value} _groupHover={{ bg: 'surfaceTertiary' }} />
          )}
        />
      </Table.Body>
    </Table.Root>
  );
};
