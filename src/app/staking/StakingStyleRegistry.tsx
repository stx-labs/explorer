'use client';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';
import { ReactNode, useState } from 'react';

// Emit styles before streamed content instead of inline within its hydration tree.
export function StakingStyleRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: 'staking' });
    cache.compat = true;
    const previousInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return previousInsert(...args);
    };

    return {
      cache,
      flush: () => {
        const names = inserted;
        inserted = [];
        return names;
      },
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (!names.length) return null;
    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: names.map(name => cache.inserted[name]).join('') }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
