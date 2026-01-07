'use client';

import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  Check,
  X as XIcon,
  ArrowRight,
  Sparkles,
  Building2,
  Rocket,
  Users,
  Zap,
  Star,
  HelpCircle,
  ChevronDown,
  LogIn,
  Menu,
  X,
  Twitter,
  Github,
  Linkedin,
  ArrowUpRight,
} from 'lucide-react';

// Hook to detect reduced motion preference
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

// Luminous Light Background with organic shapes
const LuminousBackground = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Warm cream base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FEFDFB] via-[#FBF9F7] to-[#F8F6F3]" />

      {/* Subtle warm overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        background: `
          radial-gradient(ellipse at 0% 0%, rgba(255, 237, 213, 0.5) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(219, 234, 254, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(254, 243, 199, 0.4) 0%, transparent 50%)
        `
      }} />

      {/* Floating organic blob - top right */}
      <motion.div
        className="absolute -top-20 -right-20 w-[600px] h-[600px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating organic blob - bottom left */}
      <motion.div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
        }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.15, 1],
          rotate: [0, -15, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

// Elegant gradient text
const GradientText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent ${className}`}>
    {children}
  </span>
);

// Pricing Card Component
const PricingCard = ({
  name,
  price,
  originalPrice,
  description,
  features,
  notIncluded,
  icon: Icon,
  popular,
  accentColor,
  index,
  onGetStarted,
}: {
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  notIncluded?: string[];
  icon: React.ElementType;
  popular?: boolean;
  accentColor: string;
  index: number;
  onGetStarted: () => void;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative ${popular ? 'md:-mt-8' : ''}`}
    >
      {popular && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
          <div className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}

      <div className={`relative h-full p-8 bg-white rounded-3xl border-2 transition-all duration-500 overflow-hidden ${
        popular
          ? 'border-blue-500 shadow-2xl shadow-blue-200/50 scale-105'
          : 'border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'
      }`}>
        {/* Background accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${accentColor} opacity-5 rounded-bl-[100px]`} />

        {/* Icon */}
        <div className={`relative z-10 w-16 h-16 rounded-2xl ${accentColor} bg-opacity-10 flex items-center justify-center mb-6`}>
          <Icon className={`w-8 h-8 ${accentColor.replace('bg-', 'text-')}`} />
        </div>

        {/* Plan name */}
        <h3 className="text-2xl font-black text-slate-900 mb-2 font-serif">{name}</h3>
        <p className="text-slate-500 text-sm mb-6" style={{ fontFamily: 'system-ui' }}>{description}</p>

        {/* Pricing */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-2">
            {originalPrice && (
              <span className="text-2xl text-slate-400 line-through font-semibold">${originalPrice}</span>
            )}
            <span className="text-5xl font-black text-slate-900">${price}</span>
            <span className="text-slate-500 font-medium">/month</span>
          </div>
          <p className="text-sm text-slate-500 mb-2" style={{ fontFamily: 'system-ui' }}>Billed monthly, cancel anytime</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700" style={{ fontFamily: 'system-ui' }}>First month free</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 mb-8 flex items-center justify-center gap-2 ${
            popular
              ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
          }`}
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Features */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold" style={{ fontFamily: 'system-ui' }}>
            What's included
          </p>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm leading-relaxed" style={{ fontFamily: 'system-ui' }}>{feature}</span>
              </li>
            ))}
          </ul>

          {notIncluded && notIncluded.length > 0 && (
            <ul className="space-y-3 pt-4 border-t border-slate-100">
              {notIncluded.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <XIcon className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-400 text-sm leading-relaxed" style={{ fontFamily: 'system-ui' }}>{feature}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// FAQ Item Component
const FAQItem = ({ question, answer, index }: { question: string; answer: string; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="border-b border-slate-200 last:border-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-start justify-between gap-4 text-left hover:opacity-70 transition-opacity"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'system-ui' }}>{question}</h3>
            {isOpen && <p className="text-slate-600 mt-2 leading-relaxed" style={{ fontFamily: 'system-ui' }}>{answer}</p>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </motion.div>
  );
};

export default function PricingPage() {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: 'Starter',
      price: 29,
      originalPrice: 49,
      description: 'Perfect for small teams getting started',
      icon: Rocket,
      accentColor: 'bg-emerald-500',
      features: [
        'Up to 10 employees',
        'Basic employee management',
        'Time tracking & timesheets',
        'Leave management',
        'Mobile app access',
        'Email support',
        'Basic reporting',
        'Attendance tracking',
      ],
      notIncluded: [
        'Advanced analytics',
        'Project management',
        'API access',
        'Custom integrations',
        'Priority support',
      ],
    },
    {
      name: 'Professional',
      price: 79,
      originalPrice: 129,
      description: 'For growing teams that need more power',
      icon: Building2,
      accentColor: 'bg-blue-500',
      popular: true,
      features: [
        'Up to 50 employees',
        'Everything in Starter, plus:',
        'Advanced analytics dashboard',
        'Project management tools',
        'Meeting scheduler',
        'Custom workflows',
        'API access',
        'Bulk operations',
        'Priority email support',
        'Custom reports',
        'Role-based permissions',
      ],
      notIncluded: [
        'Unlimited employees',
        'Dedicated account manager',
        'Custom integrations',
      ],
    },
    {
      name: 'Enterprise',
      price: 199,
      description: 'For large organizations with advanced needs',
      icon: Zap,
      accentColor: 'bg-violet-500',
      features: [
        'Unlimited employees',
        'Everything in Professional, plus:',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security features',
        'SLA guarantee (99.9% uptime)',
        'White-labeling options',
        'Custom onboarding',
        '24/7 phone support',
        'Compliance reports',
        'Multi-location support',
        'Advanced permissions',
        'Custom contracts',
      ],
    },
  ];

  const faqs = [
    {
      question: 'Can I change my plan later?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! All plans include your first month completely free. No credit card required to start. You can explore all features before committing.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and for Enterprise plans, we can arrange wire transfers or invoicing.',
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, there are no long-term contracts. You can cancel your subscription at any time, and you\'ll retain access until the end of your billing period.',
    },
    {
      question: 'Do you offer discounts for annual billing?',
      answer: 'Yes! Save 20% when you choose annual billing. Contact our sales team for enterprise volume discounts.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level encryption, regular security audits, and comply with GDPR, SOC 2, and ISO 27001 standards.',
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'You can export all your data at any time. After cancellation, we retain your data for 30 days in case you want to reactivate.',
    },
    {
      question: 'Do you offer implementation support?',
      answer: 'Yes! Professional and Enterprise plans include onboarding assistance. Enterprise customers get dedicated implementation support.',
    },
  ];

  const navItems = [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <LuminousBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-2' : 'py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500 ${
            scrolled ? 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-lg shadow-slate-200/30' : ''
          }`}>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <span className="text-white font-black text-xl" style={{ fontFamily: 'system-ui' }}>Z</span>
              </motion.div>
              <span className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>
                Zenora<span className="text-blue-600">.ai</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium relative group"
                  style={{ fontFamily: 'system-ui' }}
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                style={{ fontFamily: 'system-ui' }}
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
              <button
                onClick={() => setContactModalOpen(true)}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-xl">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-slate-600 hover:text-slate-900 py-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <button
                      onClick={() => { setMobileMenuOpen(false); setContactModalOpen(true); }}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold"
                    >
                      Get Started
                    </button>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700" style={{ fontFamily: 'system-ui' }}>Simple, Transparent Pricing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight"
          >
            Choose Your
            <span className="block"><GradientText>Perfect Plan</GradientText></span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto mb-8"
            style={{ fontFamily: 'system-ui' }}
          >
            No hidden fees. No long-term contracts. Get your first month free.
          </motion.p>

          {/* Savings Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-full mb-12"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700" style={{ fontFamily: 'system-ui' }}>
              Limited Time: First month free + Save up to 40%
            </span>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
            {plans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                {...plan}
                index={index}
                onGetStarted={() => setContactModalOpen(true)}
              />
            ))}
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className="text-sm text-slate-500 mb-6" style={{ fontFamily: 'system-ui' }}>Trusted by thousands of companies worldwide</p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Frequently Asked
              <span className="block"><GradientText>Questions</GradientText></span>
            </h2>
            <p className="text-lg text-slate-500" style={{ fontFamily: 'system-ui' }}>
              Everything you need to know about pricing and plans
            </p>
          </motion.div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            {faqs.map((faq, index) => (
              <FAQItem key={faq.question} {...faq} index={index} />
            ))}
          </div>

          {/* Still have questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center p-8 bg-gradient-to-br from-blue-50 to-violet-50 rounded-3xl border border-blue-100"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'system-ui' }}>Still have questions?</h3>
            <p className="text-slate-600 mb-6" style={{ fontFamily: 'system-ui' }}>Our team is here to help you choose the right plan</p>
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg"
              style={{ fontFamily: 'system-ui' }}
            >
              Contact Sales
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-900 text-white">
        {/* Gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-6">
          {/* Main footer content */}
          <div className="py-16 grid grid-cols-1 md:grid-cols-5 gap-12">
            {/* Brand column */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                  <span className="text-white font-black text-xl" style={{ fontFamily: 'system-ui' }}>Z</span>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>Zenora<span className="text-blue-400">.ai</span></span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs" style={{ fontFamily: 'system-ui' }}>
                The all-in-one employee management platform for modern businesses. Trusted by thousands worldwide.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: Twitter, href: '#' },
                  { icon: Github, href: '#' },
                  { icon: Linkedin, href: '#' },
                ].map((social, i) => (
                  <Link
                    key={i}
                    href={social.href}
                    className="p-2.5 text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                  >
                    <social.icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Links columns */}
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Demo', 'API Docs', 'Integrations'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance', 'GDPR'] },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider" style={{ fontFamily: 'system-ui' }}>{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 group" style={{ fontFamily: 'system-ui' }}>
                        {link}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="py-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm" style={{ fontFamily: 'system-ui' }}>© 2025 Zenora.ai. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-slate-400" style={{ fontFamily: 'system-ui' }}>
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
