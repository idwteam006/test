'use client';

import { useRef, ReactNode, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { gsap } from '@/lib/gsap-config';
import { useReducedMotion } from '@/hooks';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  scale?: number;
  perspective?: number;
}

export function TiltCard({
  children,
  className,
  maxTilt = 5, // Reduced from 10 to 5 for subtler effect
  glare = true,
  scale = 1.02,
  perspective = 1000,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef(0);
  const isTouchDeviceRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Detect touch device on mount
  useEffect(() => {
    isTouchDeviceRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Cleanup GSAP tweens on unmount
  useEffect(() => {
    const card = cardRef.current;
    const glareEl = glareRef.current;

    return () => {
      if (card) gsap.killTweensOf(card);
      if (glareEl) gsap.killTweensOf(glareEl);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Disable tilt effect on touch devices or reduced motion
    if (isTouchDeviceRef.current || prefersReducedMotion || !cardRef.current) return;

    // Throttle to 30fps (33ms)
    const now = Date.now();
    if (now - lastUpdateRef.current < 33) return;
    lastUpdateRef.current = now;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const tiltX = (y - 0.5) * maxTilt * -1;
    const tiltY = (x - 0.5) * maxTilt;

    // Kill previous tweens before creating new ones
    gsap.killTweensOf(cardRef.current);
    gsap.to(cardRef.current, {
      rotateX: tiltX,
      rotateY: tiltY,
      scale: scale,
      duration: 0.4,
      ease: 'power2.out',
    });

    // Update glare position using CSS custom properties (GPU-accelerated)
    if (glare && glareRef.current) {
      gsap.killTweensOf(glareRef.current);
      // Use CSS custom properties instead of regenerating gradient string
      glareRef.current.style.setProperty('--glare-x', `${x * 100}%`);
      glareRef.current.style.setProperty('--glare-y', `${y * 100}%`);
      gsap.to(glareRef.current, {
        opacity: 0.15,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, [prefersReducedMotion, maxTilt, scale, glare]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDeviceRef.current || prefersReducedMotion || !cardRef.current) return;

    // Kill any running tweens first
    gsap.killTweensOf(cardRef.current);
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.4,
      ease: 'power2.out', // Simpler ease, faster than elastic
    });

    if (glare && glareRef.current) {
      gsap.killTweensOf(glareRef.current);
      gsap.to(glareRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, [prefersReducedMotion, glare]);

  return (
    <motion.div
      ref={cardRef}
      className={cn('relative', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: perspective, // Set perspective once in CSS
      }}
    >
      {children}

      {/* Glare overlay - using CSS custom properties for position */}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0"
          style={{
            background: 'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.8) 0%, transparent 60%)',
          }}
        />
      )}
    </motion.div>
  );
}
