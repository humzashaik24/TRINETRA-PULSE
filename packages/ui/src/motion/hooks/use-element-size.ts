'use client';

import { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Tracks an element's size using ResizeObserver.
 * Useful for animating height changes (collapse/expand).
 *
 * @example
 * const { ref, size } = useElementSize<HTMLDivElement>();
 * <motion.div animate={{ height: size.height }} ref={ref}>
 *   {content}
 * </motion.div>
 */
export function useElementSize<T extends HTMLElement = HTMLElement>(): {
  ref: React.RefObject<T>;
  size: Size;
} {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
