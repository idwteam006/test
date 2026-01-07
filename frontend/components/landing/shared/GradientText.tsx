'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  gradient?: 'primary' | 'aurora' | 'gold' | 'custom';
  customGradient?: string;
}

const gradients = {
  primary: 'from-indigo-600 via-purple-600 to-blue-600',
  aurora: 'from-[hsl(280,100%,70%)] via-[hsl(200,100%,60%)] to-[hsl(320,100%,65%)]',
  gold: 'from-amber-500 via-yellow-500 to-orange-500',
  custom: '',
};

export function GradientText({
  children,
  className,
  animate = false,
  gradient = 'primary',
  customGradient,
}: GradientTextProps) {
  const gradientClass = gradient === 'custom' ? customGradient : gradients[gradient];

  // Use CSS animation instead of Framer Motion for better performance
  // Duration increased from 3s to 8s for subtler, cheaper animation
  if (animate) {
    return (
      <span
        className={cn(
          'bg-gradient-to-r bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift',
          gradientClass,
          className
        )}
        style={{
          // Override default 8s with custom slower animation
          animationDuration: '8s',
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        gradientClass,
        className
      )}
    >
      {children}
    </span>
  );
}

// Text that reveals with a gradient mask animation
// Note: Uses CSS animation for simpler entrance effect
export function RevealGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-block', className)}>
      <GradientText>{children}</GradientText>
    </span>
  );
}
