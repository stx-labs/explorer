'use client';

import { Stack } from '@chakra-ui/react';

import { AddressHeader } from './redesign/AddressHeader';
import { AddressTabs } from './redesign/AddressTabs';

export default function AddressPage({ principal }: { principal: string }) {
  return (
    <Stack gap={8}>
      <AddressHeader principal={principal} />
      <AddressTabs principal={principal} />
    </Stack>
  );
}
