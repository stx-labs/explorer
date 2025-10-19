'use client';

import { Alert } from '@chakra-ui/react';

export function AlertBase({
  status,
  message,
}: {
  status: Alert.RootProps['status'];
  message: string;
}) {
  return (
    <Alert.Root status={status} rounded={'lg'}>
      <Alert.Indicator />
      <Alert.Description fontSize={'sm'}>{message}</Alert.Description>
    </Alert.Root>
  );
}
