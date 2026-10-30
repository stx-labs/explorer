'use client';

import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';

export function AddressConfirmedTxs({ principal }: { principal: string }) {
  return <AddressTxsTable principal={principal} />;
}
