'use client';

import { useEffect, useState } from 'react';

/**
 * Detects the user's `prefers-reduced-motion` media query.
 * Returns `true` when the user has requested reduced motion.
 *
 * Use this to conditionally disable animations
 * or switch to instant transitions.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
