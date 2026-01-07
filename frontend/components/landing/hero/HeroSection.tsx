'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Play,
  CheckCircle2,
  Shield,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks';
import { GradientText, MagneticButton, SectionBadge } from '../shared';
import { ParticleField, FloatingShapes } from '../backgrounds';

interface HeroSectionProps {
  onOpenContactModal: () => void;
}

export function HeroSection({ onOpenContactModal }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const trustIndicators = [
    { icon: CheckCircle2, text: '14-day free trial' },
    { icon: Shield, text: 'Enterprise security' },
    { icon: TrendingUp, text: 'Setup in 5 minutes' },
  ];

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
    >
      {/* Background effects - minimal professional decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingShapes />
        <ParticleField particleCount={6} />
      </div>

      {/* Hero Content */}
      <motion.div
        style={{
          y: prefersReducedMotion ? 0 : heroY,
          opacity: prefersReducedMotion ? 1 : heroOpacity,
          scale: prefersReducedMotion ? 1 : heroScale,
        }}
        className="relative z-10 max-w-6xl mx-auto px-6 text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <SectionBadge icon={<Sparkles className="w-4 h-4" />}>
            Enterprise-Grade HR Platform
            <ChevronRight className="w-4 h-4 ml-1" />
          </SectionBadge>
        </motion.div>

        {/* Headline with staggered word animation */}
        <div className="mb-8">
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.08,
                },
              },
            }}
          >
            <AnimatedWord delay={0.3}>The Future of</AnimatedWord>
            <br />
            <motion.span
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <GradientText animate>Workforce</GradientText>
            </motion.span>
            <br />
            <AnimatedWord delay={0.7}>Management</AnimatedWord>
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          Streamline HR operations, automate workflows, and empower your team with
          AI-powered insights. All in one beautiful platform.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <MagneticButton variant="primary" onClick={onOpenContactModal}>
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>
          <MagneticButton variant="secondary" href="#demo">
            <Play className="w-5 h-5" />
            Watch Demo
          </MagneticButton>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-slate-600"
        >
          {trustIndicators.map((item, index) => (
            <motion.div
              key={item.text}
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 + index * 0.1, duration: 0.5 }}
            >
              <item.icon className="w-5 h-5 text-indigo-600" />
              <span className="font-medium">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 cursor-pointer group"
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }}
        >
          <span className="text-xs text-slate-500 uppercase tracking-widest font-medium group-hover:text-indigo-600 transition-colors">
            Scroll
          </span>
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Animated word component for headline
function AnimatedWord({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.span>
  );
}
