import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';
import type { StackProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface OverviewCardProps extends Omit<StackProps, 'title'> {
  title: ReactNode;
  stat: ReactNode;
  subStat?: ReactNode;
  caption?: ReactNode;
}

export function OverviewCard({ title, stat, subStat, caption, ...rest }: OverviewCardProps) {
  return (
    <Stack
      aria-label={typeof title === 'string' ? title : undefined}
      py={3}
      px={4}
      bg="surfacePrimary"
      borderRadius="redesign.md"
      {...rest}
      css={{
        '&:first-of-type': {
          bg: 'linear-gradient(138deg, var(--stacks-colors-surface-primary) 73.53%, #FF5512 161.25%)',
        },
      }}
    >
      <Text textStyle="text-medium-sm" color="textSecondary" whiteSpace="nowrap">
        {title}
      </Text>
      <Flex gap={1.5} alignItems="baseline">
        {typeof stat === 'number' || typeof stat === 'string' ? (
          <Text fontWeight="medium" textStyle="heading-sm" color="textPrimary" whiteSpace="nowrap">
            {stat}
          </Text>
        ) : (
          stat
        )}
        {typeof subStat === 'string' || typeof subStat === 'number' ? (
          <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
            {subStat}
          </Text>
        ) : (
          subStat
        )}
      </Flex>
      {caption && (
        <Text textStyle="text-regular-xs" color="textSecondary">
          {caption}
        </Text>
      )}
    </Stack>
  );
}
