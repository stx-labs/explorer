import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';

import { EventsTable, EventsTableData } from './EventsTable';
import { useEventsTableFilters } from './filters/useEventsTableFilters';

export function EventsTableWithFilters({
  txId,
  initialData,
  pageSize,
}: {
  txId: string;
  initialData: GenericResponseType<EventsTableData> | undefined;
  pageSize: number;
}) {
  const { address, eventAssetTypes } = useEventsTableFilters();
  return (
    <EventsTable
      txId={txId}
      initialData={initialData}
      filters={{ address, eventAssetTypes }}
      pageSize={pageSize}
    />
  );
}
