import { NUM_TEN_MINUTES_IN_DAY } from '@/common/utils/consts';

import { useSuspensePoxInfoRaw } from '../../../../common/queries/usePoxInforRaw';
import { MICROSTACKS_IN_STACKS } from '../../../../common/utils/utils';

export function useSuspenseCurrentStackingCycle() {
  const { data: poxData } = useSuspensePoxInfoRaw();
  const {
    current_cycle: { id: currentCycleId = 0, stacked_ustx = 0 } = ({} = {}),
    next_reward_cycle_in,
    reward_cycle_length,
  } = poxData || {};

  const currentCycleStackedSTX = stacked_ustx / MICROSTACKS_IN_STACKS;
  const blocksTilNextCycle = next_reward_cycle_in || 0;
  const approximateDaysTilNextCycle = Math.floor(blocksTilNextCycle / NUM_TEN_MINUTES_IN_DAY);
  const currentCycleProgressPercentage =
    (reward_cycle_length - next_reward_cycle_in) / reward_cycle_length;
  const approximateDaysSinceCurrentCycleStart = Math.floor(
    (reward_cycle_length - next_reward_cycle_in) / NUM_TEN_MINUTES_IN_DAY
  );
  return {
    currentCycleId,
    currentCycleProgressPercentage,
    currentCycleStackedSTX,
    blocksTilNextCycle,
    approximateDaysTilNextCycle,
    approximateDaysSinceCurrentCycleStart,
  };
}
