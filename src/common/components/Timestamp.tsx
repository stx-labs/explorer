'use client';

import { Flex, FlexProps } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { Tooltip } from '../../ui/Tooltip';
import RelativeTimeDisplay from './RelativeTimeDisplay';
import { Value } from './Value';

interface TimestampProps {
  ts: number;
}

export function Timestamp({ ts, ...rest }: TimestampProps & FlexProps) {
  const [readableTimestamp, setReadableTimestamp] = useState('');

  useEffect(() => {
    if (ts) {
      const date = new Date(ts * 1000);
      setReadableTimestamp(`${date.toLocaleTimeString()} ${date.toLocaleDateString()}`);
    }
  }, [ts]);

  return (
    <Tooltip content={readableTimestamp}>
      <Flex alignItems="center" {...rest}>
        <Value suppressHydrationWarning={true}>
          <RelativeTimeDisplay timestampInMs={ts} />
        </Value>
      </Flex>
    </Tooltip>
  );
}
