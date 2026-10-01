import { OverviewActivity } from './OverviewActivity';
import { loadActivityFeed } from './activity-data';
import type { ActivityGroup } from './activity-filter';

export async function ActivitySection({
  chain,
  api,
  group,
}: {
  chain: string;
  api?: string;
  group?: ActivityGroup;
}) {
  const activity = await loadActivityFeed(chain, api, group);
  return (
    <OverviewActivity
      chain={chain}
      api={api}
      initialGroup={group}
      initialData={activity}
      initialDataUpdatedAt={Date.now()}
    />
  );
}
