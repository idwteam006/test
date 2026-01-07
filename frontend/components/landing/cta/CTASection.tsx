'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, MousePointer2, ArrowRight } from 'lucide-react';
import { GradientText, MagneticButton, RevealOnScroll } from '../shared';
import { useReducedMotion } from '@/hooks';

interface CTASectionProps {
  onOpenContactModal: () => void;
}

export function CTASection({ onOpenContactModal }: CTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section ref={sectionRef} className="py-32 relative overflow-hidden">
      {/* Background decorations - simplified for performance */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Static gradient mesh using box-shadow instead of blur */}
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
          style={{ boxShadow: '0 0 120px 60px rgba(99, 102, 241, 0.08)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
          style={{ boxShadow: '0 0 120px 60px rgba(139, 92, 246, 0.08)' }}
        />

        {/* Single floating shape (reduced from 3) */}
        <motion.div
          className="absolute top-20 left-[10%] w-14 h-14 border border-indigo-200/50 rounded-full"
          animate={prefersReducedMotion ? {} : { y: [0, -15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <RevealOnScroll animation="scaleIn">
          {/* Animated Rocket Icon - simplified animation */}
          <div className="relative inline-block mb-8">
            <motion.div
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>

            {/* Static exhaust trail effect - removed animation for performance */}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-8 rounded-full opacity-50"
              style={{
                background: 'linear-gradient(to bottom, rgba(251, 146, 60, 0.5), transparent)',
              }}
            />
          </div>
        </RevealOnScroll>

        <RevealOnScroll animation="fadeUp" delay={0.1}>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-slate-900">
            Ready to Transform
            <br />
            <GradientText>Your Workforce?</GradientText>
          </h2>
        </RevealOnScroll>

        <RevealOnScroll animation="fadeUp" delay={0.2}>
          <p className="text-lg sm:text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            Join thousands of companies already using Zenora to streamline their
            operations and empower their teams.
          </p>
        </RevealOnScroll>

        <RevealOnScroll animation="fadeUp" delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <MagneticButton variant="primary" onClick={onOpenContactModal}>
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </MagneticButton>
            <MagneticButton variant="secondary" href="#demo">
              <MousePointer2 className="w-5 h-5" />
              Schedule a Demo
            </MagneticButton>
          </div>
        </RevealOnScroll>

        <RevealOnScroll animation="fadeIn" delay={0.4}>
          <p className="text-sm text-slate-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
