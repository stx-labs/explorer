'use client';

import { Badge, DefaultBadgeLabel } from '@/ui/Badge';
import { Box, Flex } from '@chakra-ui/react';

/**
 * Where a bond is in its life, drawn with the explorer's Badge recipe so it
 * sits beside the transaction and block badges used elsewhere.
 *
 * Tones are colour meanings rather than contract states, so the API's two
 * statuses and the contract's five lifecycle states can both map onto them.
 */
export type BondStateTone = 'active' | 'pending' | 'enrolling' | 'maturity' | 'closed';

const DOT_COLORS: Record<BondStateTone, string> = {
  active: 'feedback.green-500',
  pending: 'iconTertiary',
  enrolling: 'accent.bitcoin-500',
  maturity: 'feedback.bronze-600',
  closed: 'iconTertiary',
};

export function BondStateBadge({ tone, label }: { tone: BondStateTone; label: string }) {
  return (
    <Badge variant="outline" content="iconAndLabel" pl={1.5} w="fit-content">
      <Flex alignItems="center" gap={1.5}>
        <Box w={1.5} h={1.5} borderRadius="full" bg={DOT_COLORS[tone]} flexShrink={0} />
        <DefaultBadgeLabel label={label} />
      </Flex>
    </Badge>
  );
}
