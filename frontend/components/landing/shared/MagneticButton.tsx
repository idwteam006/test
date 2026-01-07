'use client';

import { useRef, ReactNode, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { gsap } from '@/lib/gsap-config';
import { useReducedMotion } from '@/hooks';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
  magneticStrength?: number;
  disabled?: boolean;
}

export function MagneticButton({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className,
  magneticStrength = 0.4,
  disabled = false,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef(0);
  const isTouchDeviceRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Detect touch device on mount
  useEffect(() => {
    isTouchDeviceRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Cleanup GSAP tweens on unmount
  useEffect(() => {
    const button = buttonRef.current;
    const content = contentRef.current;
    const glow = glowRef.current;

    return () => {
      if (button) gsap.killTweensOf(button);
      if (content) gsap.killTweensOf(content);
      if (glow) gsap.killTweensOf(glow);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Disable magnetic effect on touch devices, reduced motion, or if disabled
    if (isTouchDeviceRef.current || prefersReducedMotion || disabled || !buttonRef.current) return;

    // Throttle to 30fps (33ms)
    const now = Date.now();
    if (now - lastUpdateRef.current < 33) return;
    lastUpdateRef.current = now;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Kill previous tweens before creating new ones
    gsap.killTweensOf(buttonRef.current);
    gsap.to(buttonRef.current, {
      x: x * magneticStrength,
      y: y * magneticStrength,
      duration: 0.3,
      ease: 'power2.out',
    });

    if (contentRef.current) {
      gsap.killTweensOf(contentRef.current);
      gsap.to(contentRef.current, {
        x: x * magneticStrength * 0.5,
        y: y * magneticStrength * 0.5,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    // Update glow position
    if (glowRef.current && variant === 'primary') {
      gsap.killTweensOf(glowRef.current);
      gsap.to(glowRef.current, {
        x: x * 0.2,
        y: y * 0.2,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [prefersReducedMotion, disabled, magneticStrength, variant]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDeviceRef.current || prefersReducedMotion || !buttonRef.current) return;

    // Kill any running tweens first
    gsap.killTweensOf(buttonRef.current);
    gsap.to(buttonRef.current, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: 'power2.out', // Simpler ease, faster than elastic
    });

    if (contentRef.current) {
      gsap.killTweensOf(contentRef.current);
      gsap.to(contentRef.current, {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }

    if (glowRef.current) {
      gsap.killTweensOf(glowRef.current);
      gsap.to(glowRef.current, {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, [prefersReducedMotion]);

  const baseClasses = cn(
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 overflow-hidden group',
    {
      'px-5 py-2.5 text-sm': size === 'sm',
      'px-8 py-4 text-base': size === 'md',
      'px-10 py-5 text-lg': size === 'lg',
    },
    {
      'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:bg-[position:100%_0]':
        variant === 'primary',
      'bg-white text-slate-900 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm hover:shadow-lg':
        variant === 'secondary',
      'text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50':
        variant === 'ghost',
    },
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const content = (
    <>
      {/* Glow effect for primary variant */}
      {variant === 'primary' && (
        <div
          ref={glowRef}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Ripple overlay */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        initial={{ scale: 0, opacity: 0.5 }}
        whileTap={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Content */}
      <span ref={contentRef} className="relative z-10 flex items-center gap-2">
        {children}
      </span>

      {/* Shine effect */}
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        ref={buttonRef as React.RefObject<HTMLAnchorElement>}
        className={baseClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      className={baseClasses}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
