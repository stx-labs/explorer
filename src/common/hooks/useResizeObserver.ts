import { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver(ref: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (ref.current) {
      observerRef.current = new ResizeObserver(entries => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setSize({ width, height });
        }
      });

      observerRef.current.observe(ref.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [ref]);

  return size;
}

export default useResizeObserver;
