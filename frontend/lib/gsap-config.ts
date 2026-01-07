'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Register GSAP plugins (only runs once)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Configure GSAP defaults for consistent animations
gsap.defaults({
  ease: 'power3.out',
  duration: 0.8,
});

// Custom easing curves for Zenora brand
const ZENORA_EASES = {
  smooth: 'power3.out',
  smoothInOut: 'power3.inOut',
  bounce: 'elastic.out(1, 0.5)',
  snappy: 'power4.out',
  gentle: 'power2.out',
} as const;

// Animation presets for consistent micro-interactions
const ANIMATION_PRESETS = {
  fadeUp: {
    from: { opacity: 0, y: 60 },
    to: { opacity: 1, y: 0 },
  },
  fadeDown: {
    from: { opacity: 0, y: -60 },
    to: { opacity: 1, y: 0 },
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
  },
  slideInLeft: {
    from: { opacity: 0, x: -100 },
    to: { opacity: 1, x: 0 },
  },
  slideInRight: {
    from: { opacity: 0, x: 100 },
    to: { opacity: 1, x: 0 },
  },
} as const;

// ScrollTrigger default configuration
const SCROLL_TRIGGER_DEFAULTS = {
  start: 'top 80%',
  end: 'bottom 20%',
  toggleActions: 'play none none reverse',
} as const;

export {
  gsap,
  ScrollTrigger,
  useGSAP,
  ZENORA_EASES,
  ANIMATION_PRESETS,
  SCROLL_TRIGGER_DEFAULTS,
};
