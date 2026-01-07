'use client';

import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  Shield,
  Heart,
  Calculator,
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  Award,
  Target,
  Briefcase,
  UserCheck,
  DollarSign,
  PieChart,
  CheckCircle2,
  Sparkles,
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

// Luminous Light Background
const LuminousBackground = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FEFDFB] via-[#FBF9F7] to-[#F8F6F3]" />

      <div className="absolute inset-0 opacity-40" style={{
        background: `
          radial-gradient(ellipse at 0% 0%, rgba(255, 237, 213, 0.5) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(219, 234, 254, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(254, 243, 199, 0.4) 0%, transparent 50%)
        `
      }} />

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

// Gradient text
const GradientText = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
    {children}
  </span>
);

// Feature card component
const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group"
    >
      <div className="h-full p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'system-ui' }}>
          {feature.desc}
        </p>
      </div>
    </motion.div>
  );
};

// Role section component
const RoleSection = ({ role, index }: { role: any; index: number }) => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const Icon = role.icon;

  return (
    <section ref={sectionRef} className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Role Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Role Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'system-ui' }}>
              {role.name} Portal
            </span>
          </div>

          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            <GradientText>{role.description}</GradientText>
          </h2>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-8">
            {Object.entries(role.stats).map(([key, value], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div className={`text-3xl font-black bg-gradient-to-r ${role.color} bg-clip-text text-transparent`}>
                  {String(value)}
                </div>
                <div className="text-sm text-slate-500 uppercase tracking-wide mt-1" style={{ fontFamily: 'system-ui' }}>
                  {key}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {role.features.map((feature: any, idx: number) => (
            <FeatureCard key={idx} feature={feature} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};

const roles = [
  {
    id: 'employee',
    name: 'Employee',
    icon: Users,
    color: 'from-cyan-500 to-blue-600',
    description: 'Self-service portal for daily tasks',
    features: [
      { icon: Clock, title: 'Time Tracking', desc: 'Log hours with built-in timer and bulk entry options' },
      { icon: Calendar, title: 'Leave Requests', desc: 'Submit and track time-off requests instantly' },
      { icon: FileText, title: 'Timesheets', desc: 'View and submit weekly timesheets with ease' },
      { icon: UserCheck, title: 'Profile Management', desc: 'Update personal information and documents' },
    ],
    stats: { users: '5,000+', satisfaction: '98%', tasks: '50K+' },
  },
  {
    id: 'manager',
    name: 'Manager',
    icon: Target,
    color: 'from-violet-500 to-purple-600',
    description: 'Team oversight and performance tools',
    features: [
      { icon: Users, title: 'Team Dashboard', desc: 'Real-time view of team activities and status' },
      { icon: CheckCircle2, title: 'Approvals', desc: 'Quick approve/reject for leave and timesheets' },
      { icon: BarChart3, title: 'Performance', desc: 'Track team metrics and productivity insights' },
      { icon: Award, title: 'Goals & OKRs', desc: 'Set and monitor team objectives effectively' },
    ],
    stats: { teams: '1,200+', approvals: '99.5%', insights: 'Real-time' },
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Shield,
    color: 'from-rose-500 to-pink-600',
    description: 'Complete system control and configuration',
    features: [
      { icon: Users, title: 'User Management', desc: 'Create, edit, and manage all user accounts' },
      { icon: Shield, title: 'Permissions', desc: 'Granular role-based access control system' },
      { icon: Briefcase, title: 'Organization', desc: 'Manage departments, teams, and structure' },
      { icon: FileText, title: 'System Config', desc: 'Configure workflows and business rules' },
    ],
    stats: { orgs: '500+', uptime: '99.9%', security: 'SOC2' },
  },
  {
    id: 'hr',
    name: 'HR',
    icon: Heart,
    color: 'from-amber-500 to-orange-600',
    description: 'Employee lifecycle and engagement',
    features: [
      { icon: Users, title: 'Onboarding', desc: 'Digital employee onboarding workflows' },
      { icon: Calendar, title: 'Leave Policies', desc: 'Configure and manage all leave types' },
      { icon: TrendingUp, title: 'Analytics', desc: 'Comprehensive workforce insights and reporting' },
      { icon: Heart, title: 'Engagement', desc: 'Pulse surveys and feedback tools for teams' },
    ],
    stats: { hires: '2,000+', retention: '94%', nps: '+72' },
  },
  {
    id: 'accountant',
    name: 'Accountant',
    icon: Calculator,
    color: 'from-emerald-500 to-teal-600',
    description: 'Financial operations and billing',
    features: [
      { icon: DollarSign, title: 'Invoicing', desc: 'Auto-generate invoices from timesheets' },
      { icon: Calculator, title: 'Payroll', desc: 'Process payroll with time tracking integration' },
      { icon: PieChart, title: 'Reports', desc: 'Comprehensive financial reports and analytics' },
      { icon: FileText, title: 'Expenses', desc: 'Track and approve employee expenses efficiently' },
    ],
    stats: { invoices: '15K+', accuracy: '99.8%', savings: '40%' },
  },
];

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              <Link
                href="/pricing"
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl transition-all"
              >
                Get Started
              </Link>
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
                    <Link
                      href="/pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold block text-center"
                    >
                      Get Started
                    </Link>
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
            <span className="text-sm font-medium text-blue-700" style={{ fontFamily: 'system-ui' }}>Role-Based Features</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight"
          >
            Built for Every
            <span className="block"><GradientText>Team Member</GradientText></span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 max-w-3xl mx-auto mb-12"
            style={{ fontFamily: 'system-ui' }}
          >
            Tailored experiences for employees, managers, admins, HR, and accountants.
            One platform, five powerful portals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/pricing"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              Book a Demo
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Role Sections */}
      {roles.map((role, index) => (
        <RoleSection key={role.id} role={role} index={index} />
      ))}

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-3xl p-12 md:p-16 shadow-2xl shadow-blue-500/20"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'system-ui' }}>
              Join thousands of teams already using Zenora to streamline operations and boost productivity.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-blue-500/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-blue-500/30 transition-all"
              >
                Contact Sales
              </Link>
            </div>
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
