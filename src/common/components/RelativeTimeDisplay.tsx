import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

import { ONE_MINUTE } from '../queries/query-stale-time';

export const RelativeTimeDisplay = ({ timestampInMs }: { timestampInMs: number }) => {
  const [display, setDisplay] = useState('');

  const updateDisplay = useCallback(() => {
    const now = Date.now() / 1000;
    const diff = Math.round(now - timestampInMs);
    if (diff >= 0 && diff < 60) {
      setDisplay(`${diff}s ago`);
    } else {
      setDisplay(dayjs().to(dayjs(timestampInMs * 1000)));
    }
  }, [timestampInMs]);

  useEffect(() => {
    updateDisplay();
    const interval = setInterval(updateDisplay, ONE_MINUTE);
    return () => clearInterval(interval);
  }, [timestampInMs, updateDisplay]);

  return <>{display}</>;
};

export default RelativeTimeDisplay;
