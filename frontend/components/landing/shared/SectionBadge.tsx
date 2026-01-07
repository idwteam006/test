'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionBadgeProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function SectionBadge({ children, icon, className }: SectionBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-indigo-50 border border-indigo-100',
        'text-sm font-semibold text-indigo-700',
        className
      )}
    >
      {icon && <span className="text-indigo-600">{icon}</span>}
      {children}
    </motion.div>
  );
}
