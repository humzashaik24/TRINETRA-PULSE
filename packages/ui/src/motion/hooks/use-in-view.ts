'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface InViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface InViewState {
  isInView: boolean;
  ref: React.RefObject<HTMLElement>;
}

/**
 * Detects when an element enters the viewport.
 * Useful for triggering reveal animations.
 *
 * @example
 * const { isInView, ref } = useInView({ threshold: 0.2, triggerOnce: true });
 * <div ref={ref}>{isInView && <AnimatedContent />}</div>
 */
export function useInView({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = false,
}: InViewOptions = {}): InViewState {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (triggerOnce && hasTriggered.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        if (inView && triggerOnce) {
          hasTriggered.current = true;
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { isInView, ref: ref as React.RefObject<HTMLElement> };
}
