import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { ReactNode } from 'react';

export const StackingCardItem = ({ label, value }: { label: string; value: ReactNode }) => {
  return (
    <Stack gap={0.5}>
      <Text textStyle="text-medium-sm" color="textSecondary">
        {label}
      </Text>
      {value}
    </Stack>
  );
};
