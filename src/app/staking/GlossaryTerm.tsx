'use client';

import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GLOSSARY } from './glossary';

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
      portalled
      closeDelay={300}
      positioning={{ placement: 'top', gutter: 2 }}
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
