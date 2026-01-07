'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * Returns true if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns animation props based on reduced motion preference
 * Use this to conditionally disable animations
 */
export function useConditionalAnimation<T extends object>(
  animationProps: T,
  fallbackProps: Partial<T> = {}
): T | Partial<T> {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? fallbackProps : animationProps;
}
