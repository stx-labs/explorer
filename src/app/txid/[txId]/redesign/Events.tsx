import { EVENTS_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { Stack } from '@chakra-ui/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { EventsTableFilters } from './events-table/EventsTableFilters';
import { EventsTableWithFilters } from './events-table/EventsTableWithFilters';
import { EventsTableFiltersProvider } from './events-table/filters/useEventsTableFilters';

export function Events({ tx }: { tx: Transaction | MempoolTransaction }) {
  return (
    <EventsTableFiltersProvider>
      <Stack>
        <EventsTableFilters />
        <EventsTableWithFilters
          txId={tx.tx_id}
          initialData={undefined}
          pageSize={EVENTS_TABLE_PAGE_SIZE}
        />
      </Stack>
    </EventsTableFiltersProvider>
  );
}
