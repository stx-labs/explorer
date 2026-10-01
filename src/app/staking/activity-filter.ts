const ACTIVITY_GROUPS = ['distributions', 'enrollments', 'unlocks', 'bonds'] as const;

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

export function parseActivityGroup(value?: string): ActivityGroup | undefined {
  return ACTIVITY_GROUPS.find(group => group === value);
}
