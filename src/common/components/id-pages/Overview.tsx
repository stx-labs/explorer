import {
  DEFAULT_BUTTON_STYLING,
  DEFAULT_ICON_STYLING,
} from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { CopyButtonRedesign } from '@/common/components/CopyButton';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';
import { ReactNode } from 'react';

export const StackingCardItem = ({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: ReactNode;
  copyValue?: string;
}) => {
  return (
    <Stack gap={0.5}>
      <Text textStyle="text-medium-sm" color="textSecondary" whiteSpace="wrap">
        {label}
      </Text>
      <Flex gap={1} alignItems="center">
        {value}
        {copyValue && (
          <CopyButtonRedesign
            initialValue={copyValue}
            aria-label={label}
            iconProps={{
              ...DEFAULT_ICON_STYLING,
              height: 3.5,
              width: 3.5,
            }}
            buttonProps={{
              ...DEFAULT_BUTTON_STYLING,
              p: 1.5,
            }}
          />
        )}
      </Flex>
    </Stack>
  );
};
