'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface NormalizedPosition {
  x: number; // -0.5 to 0.5
  y: number; // -0.5 to 0.5
}

/**
 * Hook to track mouse position globally
 */
export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

/**
 * Hook to track mouse position relative to an element
 * Returns normalized values from -0.5 to 0.5 (center is 0,0)
 */
export function useRelativeMousePosition(
  ref: RefObject<HTMLElement>
): NormalizedPosition & { isHovering: boolean } {
  const [position, setPosition] = useState<NormalizedPosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setPosition({ x, y });
  }, [ref]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, handleMouseMove, handleMouseEnter, handleMouseLeave]);

  return { ...position, isHovering };
}

/**
 * Hook for magnetic effect calculations
 * Returns transform values for magnetic button effect
 */
export function useMagneticEffect(
  ref: RefObject<HTMLElement>,
  strength: number = 0.4
): { x: number; y: number; isHovering: boolean } {
  const { x, y, isHovering } = useRelativeMousePosition(ref);

  return {
    x: isHovering ? x * strength * 40 : 0,
    y: isHovering ? y * strength * 40 : 0,
    isHovering,
  };
}
