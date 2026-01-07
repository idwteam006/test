'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Users,
  Clock,
  FileText,
  Workflow,
  LineChart,
  Shield,
  ArrowUpRight,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { TiltCard, GradientText, SectionBadge, StaggerContainer, StaggerItem } from '../shared';
import { cn } from '@/lib/utils';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
  gradient: string;
}

const features: Feature[] = [
  {
    icon: Users,
    title: 'Employee Management',
    description:
      'Streamline your workforce with intelligent employee profiles, role management, and automated workflows.',
    accentColor: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Clock,
    title: 'Time Tracking',
    description:
      'Accurate time tracking with automated timesheets, overtime calculations, and real-time attendance monitoring.',
    accentColor: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: FileText,
    title: 'Smart Invoicing',
    description:
      'Generate professional invoices instantly with AI-powered billing, automated reminders, and payment tracking.',
    accentColor: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: Workflow,
    title: 'Automated Workflows',
    description:
      'Eliminate manual tasks with intelligent automation for onboarding, approvals, and routine processes.',
    accentColor: 'text-violet-600',
    gradient: 'from-violet-500 to-violet-600',
  },
  {
    icon: LineChart,
    title: 'Advanced Analytics',
    description:
      'Make data-driven decisions with comprehensive reports, predictive insights, and customizable dashboards.',
    accentColor: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Bank-level encryption, SOC 2 compliance, and granular access controls to protect your sensitive data.',
    accentColor: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="features" ref={sectionRef} className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <SectionBadge icon={<Layers className="w-4 h-4" />} className="mb-6">
            Powerful Features
          </SectionBadge>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-slate-900">
            Everything You Need
            <br />
            <GradientText>In One Platform</GradientText>
          </h2>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            From onboarding to payroll, we've got you covered with enterprise-grade tools.
          </p>
        </motion.div>

        {/* Features Grid */}
        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          staggerDelay={0.1}
        >
          {features.map((feature, index) => (
            <StaggerItem key={feature.title} animation="fadeUp">
              <FeatureCard {...feature} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

interface FeatureCardProps extends Feature {
  index: number;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accentColor,
  gradient,
}: FeatureCardProps) {
  return (
    <TiltCard maxTilt={8} glare scale={1.02}>
      <div className="group relative h-full p-8 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-500 overflow-hidden">
        {/* Background gradient on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/0 via-purple-50/0 to-blue-50/0 group-hover:from-indigo-50/80 group-hover:via-purple-50/80 group-hover:to-blue-50/80 transition-all duration-500" />

        {/* Animated border gradient */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-10" />
        </div>

        {/* Icon */}
        <motion.div
          className={cn(
            'relative z-10 w-14 h-14 rounded-xl flex items-center justify-center mb-6',
            'bg-gradient-to-br',
            gradient,
            'shadow-lg'
          )}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="relative z-10 text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-700 transition-colors">
          {title}
        </h3>
        <p className="relative z-10 text-slate-600 leading-relaxed text-sm">
          {description}
        </p>

        {/* Arrow indicator */}
        <motion.div
          className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
          initial={{ x: 10 }}
          whileHover={{ x: 0 }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
        </motion.div>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </TiltCard>
  );
}
