'use client';

import type { Diagnosis, FailedContractCallTx } from '@/common/tx-diagnosis';
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from '@/components/ui/accordion';
import { Text } from '@/ui/Text';
import { Box, Flex } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

import { buildTechnicalRows } from './TechnicalDetailContent';

function RowHeader({ title, summary }: { title: string; summary?: string }) {
  return (
    <Flex justifyContent="space-between" alignItems="center" w="full" gap={3} py={1} minW={0}>
      <Text textStyle="text-medium-sm" color="textPrimary" whiteSpace="nowrap">
        {title}
      </Text>
      {summary && (
        <Text
          textStyle="text-mono-xs"
          color="textSecondary"
          textAlign="right"
          minW={0}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={summary}
        >
          {summary}
        </Text>
      )}
    </Flex>
  );
}

/** Collapsible source, post-condition, argument, and raw transaction details. */
export function TechnicalDetails({
  tx,
  diagnosis,
}: {
  tx: FailedContractCallTx;
  diagnosis: Diagnosis;
}) {
  const rows = buildTechnicalRows(tx, diagnosis);
  const defaultOpen = rows[0].id;
  const rowIds = rows.map(row => row.id);
  const rowIdsKey = rowIds.join(',');
  const [openRows, setOpenRows] = useState<string[]>([defaultOpen]);
  const userChangedOpenRows = useRef(false);

  useEffect(() => {
    setOpenRows(current => {
      const valid = current.filter(id => rowIds.includes(id));
      if (!userChangedOpenRows.current && !valid.includes(defaultOpen)) return [defaultOpen];
      return valid;
    });
    // rowIdsKey is the stable identity of the available rows; depending on the array would run on
    // every diagnosis render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen, rowIdsKey]);

  return (
    <Box
      px={5}
      py={2}
      bg="surfaceTertiary"
      borderTop="1px solid"
      borderColor="redesignBorderSecondary"
      data-test="why-failed-technical"
    >
      <AccordionRoot
        multiple
        lazyMount
        value={openRows}
        onValueChange={({ value }) => {
          userChangedOpenRows.current = true;
          setOpenRows(value);
        }}
        variant="plain"
      >
        {rows.map((row, index) => (
          <AccordionItem
            key={row.id}
            value={row.id}
            borderBottom={index < rows.length - 1 ? '1px solid' : 'none'}
            borderColor="redesignBorderSecondary"
          >
            <AccordionItemTrigger indicatorPlacement="end" px={0} cursor="pointer">
              <RowHeader title={row.title} summary={row.summary} />
            </AccordionItemTrigger>
            <AccordionItemContent px={0} pb={4}>
              {row.content}
            </AccordionItemContent>
          </AccordionItem>
        ))}
      </AccordionRoot>
    </Box>
  );
}
