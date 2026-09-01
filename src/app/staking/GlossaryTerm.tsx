'use client';

import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GLOSSARY } from './glossary';

/**
 * A term whose definition is one hover away, marked by a dotted underline.
 *
 * The page carries a lot of protocol vocabulary that means nothing to a first
 * time reader, and explaining it in place beats sending them elsewhere.
 */
export function GlossaryTerm({
  entry,
  children,
}: {
  entry: keyof typeof GLOSSARY;
  children?: React.ReactNode;
}) {
  const { term, definition, docsUrl } = GLOSSARY[entry];
  return (
    <Tooltip
      variant="redesignPrimary"
      size="lg"
      // The page layout clips overflow, so the definition has to leave the flow
      // or it gets cut off at the nearest bounded ancestor.
      portalled
      contentProps={{ maxW: '22rem', whiteSpace: 'normal' }}
      content={
        <Stack gap={1.5}>
          <Text textStyle="text-medium-sm" color="textInvert">
            {term}
          </Text>
          <Text textStyle="text-regular-sm" color="textInvert">
            {definition}
          </Text>
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer">
              <Flex align="center" gap={1}>
                <Text textStyle="text-medium-sm" color="textInvert" textDecoration="underline">
                  Read in the docs
                </Text>
                <Icon w={3.5} h={3.5} color="textInvert">
                  <ArrowUpRight weight="bold" />
                </Icon>
              </Flex>
            </a>
          )}
        </Stack>
      }
    >
      <Box
        as="span"
        borderBottom="1px dotted"
        borderColor="redesignBorderSecondary"
        cursor="help"
        whiteSpace="nowrap"
      >
        {children ?? term}
      </Box>
    </Tooltip>
  );
}
