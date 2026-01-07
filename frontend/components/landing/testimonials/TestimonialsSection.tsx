'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Quote, Star, Award } from 'lucide-react';
import { GradientText, SectionBadge, TiltCard, StaggerContainer, StaggerItem } from '../shared';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'VP of Operations',
    company: 'TechFlow Inc.',
    quote:
      'Zenora transformed how we manage our 200+ employees. The automation alone saved us 15 hours per week.',
    avatar: 'SC',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'HR Director',
    company: 'InnovateCo',
    quote:
      "The best HR platform we've used. Intuitive, powerful, and the support team is exceptional.",
    avatar: 'MR',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'CEO',
    company: 'StartupXYZ',
    quote:
      "As a fast-growing startup, Zenora scaled with us effortlessly. It's become essential to our operations.",
    avatar: 'EW',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <SectionBadge icon={<Award className="w-4 h-4" />} className="mb-6">
            Customer Stories
          </SectionBadge>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-slate-900">
            Loved by Teams
            <br />
            <GradientText>Worldwide</GradientText>
          </h2>
        </motion.div>

        {/* Testimonials Grid */}
        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          staggerDelay={0.15}
        >
          {testimonials.map((testimonial, index) => (
            <StaggerItem key={testimonial.name} animation="fadeUp">
              <TestimonialCard {...testimonial} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

interface TestimonialCardProps extends Testimonial {
  index: number;
}

function TestimonialCard({
  name,
  role,
  company,
  quote,
  avatar,
  rating,
}: TestimonialCardProps) {
  return (
    <TiltCard maxTilt={6} glare scale={1.01}>
      <div className="group relative p-8 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-500 h-full">
        {/* Background gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/50 group-hover:to-purple-50/50 transition-all duration-500" />

        {/* Quote Icon */}
        <motion.div
          className="relative z-10 mb-4"
          initial={{ rotate: 0 }}
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <Quote className="w-10 h-10 text-indigo-200" />
        </motion.div>

        {/* Star Rating */}
        <div className="relative z-10 flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Star
                className={`w-5 h-5 ${
                  i < rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-200'
                }`}
              />
            </motion.div>
          ))}
        </div>

        {/* Quote Text */}
        <motion.p
          className="relative z-10 text-slate-700 leading-relaxed mb-8 text-lg italic"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          "{quote}"
        </motion.p>

        {/* Author */}
        <div className="relative z-10 flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {avatar}
          </motion.div>
          <div>
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="text-sm text-slate-600">
              {role}, {company}
            </p>
          </div>
        </div>

        {/* Decorative accent */}
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-indigo-500/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </TiltCard>
  );
}
