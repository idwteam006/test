'use client';

import { useState, useEffect } from 'react';

interface DeviceCapability {
  isTouchDevice: boolean;
  isLowEndDevice: boolean;
  prefersReducedMotion: boolean;
  supportsHover: boolean;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
}

/**
 * Hook to detect device capabilities for performance optimization
 * Returns information about device hardware and user preferences
 */
export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    isTouchDevice: false,
    isLowEndDevice: false,
    prefersReducedMotion: false,
    supportsHover: true,
    deviceMemory: null,
    hardwareConcurrency: null,
  });

  useEffect(() => {
    // Detect touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect hover capability
    const supportsHover = window.matchMedia('(hover: hover)').matches;

    // Get hardware info (only available in some browsers)
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
    const hardwareConcurrency = navigator.hardwareConcurrency ?? null;

    // Determine if low-end device (heuristic based on available info)
    const isLowEndDevice =
      // Low memory device
      (deviceMemory !== null && deviceMemory <= 4) ||
      // Single or dual core
      (hardwareConcurrency !== null && hardwareConcurrency <= 2) ||
      // Mobile device with touch (conservative assumption)
      (isTouchDevice && !supportsHover);

    setCapability({
      isTouchDevice,
      isLowEndDevice,
      prefersReducedMotion,
      supportsHover,
      deviceMemory,
      hardwareConcurrency,
    });

    // Listen for reduced motion preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setCapability((prev) => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return capability;
}

/**
 * Helper hook that returns a simplified "should animate" boolean
 * based on device capabilities and user preferences
 */
export function useShouldAnimate(): boolean {
  const { isLowEndDevice, prefersReducedMotion, isTouchDevice } = useDeviceCapability();

  // Don't animate on low-end devices or if user prefers reduced motion
  // For touch devices, we still animate but with reduced complexity
  return !prefersReducedMotion && !isLowEndDevice;
}

/**
 * Helper hook that returns animation complexity level
 * 'full' - All animations enabled
 * 'reduced' - Simplified animations (fewer particles, slower speeds)
 * 'none' - No animations
 */
export function useAnimationLevel(): 'full' | 'reduced' | 'none' {
  const { isLowEndDevice, prefersReducedMotion, isTouchDevice } = useDeviceCapability();

  if (prefersReducedMotion) return 'none';
  if (isLowEndDevice || isTouchDevice) return 'reduced';
  return 'full';
}
