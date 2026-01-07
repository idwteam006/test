'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cpu, Layers, Activity, Users, LucideIcon } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap-config';
import { useReducedMotion } from '@/hooks';
import { RevealOnScroll } from '../shared';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
}

const stats: StatItem[] = [
  { value: 119, suffix: '+', label: 'API Endpoints', icon: Cpu },
  { value: 14, suffix: '', label: 'Core Modules', icon: Layers },
  { value: 99, suffix: '%', label: 'Uptime SLA', icon: Activity },
  { value: 5000, suffix: '+', label: 'Active Users', icon: Users },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <RevealOnScroll animation="fadeUp">
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-2 overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200/60">
              {stats.map((stat, index) => (
                <StatCard key={stat.label} {...stat} index={index} />
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

interface StatCardProps extends StatItem {
  index: number;
}

function StatCard({ value, suffix, label, icon: Icon, index }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  // GSAP counter animation
  useGSAP(() => {
    if (!isInView || prefersReducedMotion || !countRef.current) return;

    const counter = { value: 0 };

    gsap.to(counter, {
      value: value,
      duration: 2,
      delay: index * 0.15,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(Math.floor(counter.value));
      },
    });
  }, [isInView, value, index, prefersReducedMotion]);

  // Fallback for reduced motion
  useEffect(() => {
    if (prefersReducedMotion && isInView) {
      setDisplayValue(value);
    }
  }, [prefersReducedMotion, isInView, value]);

  return (
    <motion.div
      ref={cardRef}
      className="group relative p-6 sm:p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/50 group-hover:to-purple-50/50 transition-all duration-500 rounded-2xl" />

      {/* Icon */}
      <motion.div
        className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300"
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-6 h-6" />
      </motion.div>

      {/* Value */}
      <div className="relative">
        <span
          ref={countRef}
          className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums"
        >
          {displayValue.toLocaleString()}
        </span>
        <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {suffix}
        </span>
      </div>

      {/* Label */}
      <div className="relative mt-2 text-slate-600 text-sm font-medium uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
}
