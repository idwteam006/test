'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Rocket,
  Building2,
  Zap,
  Sparkles,
  Star,
  Check,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { GradientText, SectionBadge, TiltCard, MagneticButton } from '../shared';
import { cn } from '@/lib/utils';

interface PricingPlan {
  name: string;
  price: number;
  originalPrice: number;
  description: string;
  icon: LucideIcon;
  accentColor: string;
  popular?: boolean;
  features: string[];
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    price: 29,
    originalPrice: 49,
    description: 'Perfect for small teams getting started',
    icon: Rocket,
    accentColor: 'from-emerald-500 to-emerald-600',
    features: [
      'Up to 25 employees',
      'Basic time tracking',
      'Invoice generation',
      'Email support',
      'Mobile app access',
    ],
  },
  {
    name: 'Professional',
    price: 79,
    originalPrice: 129,
    description: 'For growing businesses',
    icon: Building2,
    accentColor: 'from-indigo-500 to-purple-600',
    popular: true,
    features: [
      'Up to 100 employees',
      'Advanced analytics',
      'Automated workflows',
      'Priority support',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    price: 199,
    originalPrice: 299,
    description: 'For large organizations',
    icon: Zap,
    accentColor: 'from-purple-500 to-violet-600',
    features: [
      'Unlimited employees',
      'Custom integrations',
      'Dedicated success manager',
      '24/7 phone support',
      'SLA guarantees',
    ],
  },
];

interface PricingSectionProps {
  onOpenContactModal: () => void;
}

export function PricingSection({ onOpenContactModal }: PricingSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className="py-32 relative bg-gradient-to-b from-slate-50 to-white"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <SectionBadge icon={<Sparkles className="w-4 h-4" />} className="mb-6">
            Simple Pricing
          </SectionBadge>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-slate-900">
            Choose Your
            <br />
            <GradientText>Perfect Plan</GradientText>
          </h2>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Get your first month free.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              {...plan}
              index={index}
              onGetStarted={onOpenContactModal}
            />
          ))}
        </div>

        {/* View More Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold group"
          >
            View detailed pricing comparison
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

interface PricingCardProps extends PricingPlan {
  index: number;
  onGetStarted: () => void;
}

function PricingCard({
  name,
  price,
  originalPrice,
  description,
  icon: Icon,
  accentColor,
  popular,
  features,
  index,
  onGetStarted,
}: PricingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={cn('relative', popular && 'md:-mt-4 md:mb-4')}
    >
      {/* Popular Badge */}
      {popular && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-indigo-500/30 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Most Popular
          </div>
        </motion.div>
      )}

      <TiltCard maxTilt={popular ? 6 : 4} glare={popular} scale={popular ? 1.02 : 1.01}>
        <div
          className={cn(
            'relative h-full p-8 bg-white rounded-2xl border-2 transition-all duration-500',
            popular
              ? 'border-indigo-500 shadow-xl shadow-indigo-100'
              : 'border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50'
          )}
        >
          {/* Gradient overlay for popular */}
          {popular && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50" />
          )}

          {/* Icon */}
          <motion.div
            className={cn(
              'relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4',
              accentColor
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>

          {/* Plan Name */}
          <h3 className="relative z-10 text-2xl font-black text-slate-900 mb-1">
            {name}
          </h3>
          <p className="relative z-10 text-slate-600 text-sm mb-6">{description}</p>

          {/* Pricing */}
          <div className="relative z-10 mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl text-slate-400 line-through font-semibold">
                ${originalPrice}
              </span>
              <span className="text-5xl font-black text-slate-900">${price}</span>
              <span className="text-slate-600">/mo</span>
            </div>
            <motion.div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                1st month free
              </span>
            </motion.div>
          </div>

          {/* Features */}
          <ul className="relative z-10 space-y-3 mb-8">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5"
                  whileHover={{ scale: 1.2 }}
                >
                  <Check className="w-3 h-3 text-indigo-600" />
                </motion.div>
                <span className="text-slate-700 text-sm leading-relaxed">
                  {feature}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <MagneticButton
            variant={popular ? 'primary' : 'secondary'}
            onClick={onGetStarted}
            className="w-full justify-center"
            magneticStrength={0.2}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </MagneticButton>
        </div>
      </TiltCard>
    </motion.div>
  );
}
