'use client';

import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Building2,
  Globe,
  Linkedin,
  Twitter,
  Facebook,
  LogIn,
  Menu,
  X,
  Github,
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

// Contact info card
const ContactInfoCard = ({
  icon: Icon,
  title,
  description,
  action,
  actionLink,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  actionLink: string;
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
    >
      <div className="relative p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-500 h-full">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 font-serif">{title}</h3>
        <p className="text-slate-600 mb-4 text-sm leading-relaxed" style={{ fontFamily: 'system-ui' }}>
          {description}
        </p>
        <a
          href={actionLink}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm group"
          style={{ fontFamily: 'system-ui' }}
        >
          {action}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </motion.div>
  );
};

// Office location card
const OfficeCard = ({
  city,
  country,
  address,
  phone,
  email,
  hours,
  mapLink,
  index,
}: {
  city: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  mapLink: string;
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
    >
      <div className="relative p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 h-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-1 font-serif">{city}</h3>
            <p className="text-slate-500 text-sm" style={{ fontFamily: 'system-ui' }}>{country}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 text-sm" style={{ fontFamily: 'system-ui' }}>{address}</p>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <a href={`tel:${phone}`} className="text-slate-600 hover:text-blue-600 text-sm" style={{ fontFamily: 'system-ui' }}>
              {phone}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <a href={`mailto:${email}`} className="text-slate-600 hover:text-blue-600 text-sm" style={{ fontFamily: 'system-ui' }}>
              {email}
            </a>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 text-sm" style={{ fontFamily: 'system-ui' }}>{hours}</p>
          </div>
        </div>

        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all"
          style={{ fontFamily: 'system-ui' }}
        >
          Get Directions
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    agreeToPrivacy: false,
  });
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToPrivacy) {
      toast.error('Please agree to the privacy policy');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          formType: 'contact',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
        agreeToPrivacy: false,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      title: '24/7 Phone Support',
      description: 'Speak with our team any time of day or night. We\'re here to help.',
      action: '+1 (470) 255-2652',
      actionLink: 'tel:+14702552652',
    },
    {
      icon: Mail,
      title: 'General Inquiries',
      description: 'Send us an email and we\'ll respond within 24 hours on business days.',
      action: 'contact@zenora.ai',
      actionLink: 'mailto:contact@zenora.ai',
    },
    {
      icon: Headphones,
      title: 'Technical Support',
      description: 'Get help with technical issues, integrations, and platform questions.',
      action: 'contact@zenora.ai',
      actionLink: 'mailto:contact@zenora.ai',
    },
  ];

  const offices = [
    {
      city: 'Alpharetta',
      country: 'Georgia, USA (HQ)',
      address: '1740 Grassland Parkway, Suite 303, Alpharetta, GA 30004',
      phone: '+1 (470) 255-2652',
      email: 'contact@zenora.ai',
      hours: 'Mon-Fri: 9:00 AM - 6:00 PM EST',
      mapLink: 'https://maps.google.com/?q=1740+Grassland+Parkway+Suite+303+Alpharetta+GA+30004',
    },
    {
      city: 'Tallinn',
      country: 'Estonia',
      address: 'Tuukri tn 19, 10152 Tallinn',
      phone: '+1 (470) 255-2652',
      email: 'contact@zenora.ai',
      hours: 'Mon-Fri: 9:00 AM - 6:00 PM EET',
      mapLink: 'https://maps.google.com/?q=Tuukri+tn+19+10152+Tallinn+Estonia',
    },
    {
      city: 'Hyderabad',
      country: 'Telangana, India',
      address: 'Plot no 22, Srinivasa Ganesh Nilayam, Secunderabad-500026',
      phone: '+1 (470) 255-2652',
      email: 'contact@zenora.ai',
      hours: 'Mon-Fri: 9:00 AM - 6:00 PM IST',
      mapLink: 'https://maps.google.com/?q=Plot+no+22+Srinivasa+Ganesh+Nilayam+Secunderabad+500026+India',
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
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700" style={{ fontFamily: 'system-ui' }}>Get in Touch</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight"
          >
            Let's Start a
            <span className="block"><GradientText>Conversation</GradientText></span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto"
            style={{ fontFamily: 'system-ui' }}
          >
            Have questions about Zenora? We're here to help you streamline your workforce management.
          </motion.p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <ContactInfoCard key={method.title} {...method} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 font-serif">
                  Send Us a Message
                </h2>
                <p className="text-slate-600" style={{ fontFamily: 'system-ui' }}>
                  Fill out the form below and our team will get back to you within 24 hours.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="John Doe"
                      style={{ fontFamily: 'system-ui' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="john@company.com"
                      style={{ fontFamily: 'system-ui' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="+1 (555) 123-4567"
                      style={{ fontFamily: 'system-ui' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Acme Inc"
                      style={{ fontFamily: 'system-ui' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="How can we help?"
                    style={{ fontFamily: 'system-ui' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2" style={{ fontFamily: 'system-ui' }}>
                    Message *
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    placeholder="Tell us more about your needs..."
                    style={{ fontFamily: 'system-ui' }}
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={formData.agreeToPrivacy}
                    onChange={(e) => setFormData({ ...formData, agreeToPrivacy: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="privacy" className="text-sm text-slate-600" style={{ fontFamily: 'system-ui' }}>
                    I agree to the{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-semibold">
                      Privacy Policy
                    </Link>
                    {' '}and consent to being contacted by Zenora.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 text-white font-semibold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'system-ui' }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:pl-8"
            >
              <div className="sticky top-24 space-y-8">
                <div className="p-8 bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl border border-blue-100">
                  <CheckCircle2 className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-3 font-serif">What to Expect</h3>
                  <ul className="space-y-3">
                    {[
                      'Response within 24 hours',
                      'Personalized consultation',
                      'Custom demo if needed',
                      'No obligation or pressure',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 text-sm" style={{ fontFamily: 'system-ui' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <Globe className="w-12 h-12 text-violet-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-3 font-serif">Global Presence</h3>
                  <p className="text-slate-600 text-sm mb-4" style={{ fontFamily: 'system-ui' }}>
                    With offices across three continents, we're always available to support your team.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500" style={{ fontFamily: 'system-ui' }}>
                    <MapPin className="w-4 h-4" />
                    <span>USA • India • Estonia</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500" style={{ fontFamily: 'system-ui' }}>Follow us:</span>
                  <div className="flex items-center gap-3">
                    {[
                      { icon: Twitter, href: '#' },
                      { icon: Linkedin, href: '#' },
                      { icon: Facebook, href: '#' },
                    ].map((social, i) => (
                      <a
                        key={i}
                        href={social.href}
                        className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <social.icon className="w-5 h-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 font-serif">
              Our <GradientText>Global Offices</GradientText>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto" style={{ fontFamily: 'system-ui' }}>
              Visit us at any of our locations or reach out to the office nearest you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {offices.map((office, index) => (
              <OfficeCard key={office.city} {...office} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-900 text-white">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="py-16 grid grid-cols-1 md:grid-cols-5 gap-12">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                  <span className="text-white font-black text-xl">Z</span>
                </div>
                <span className="text-xl font-bold">
                  Zenora<span className="text-blue-400">.ai</span>
                </span>
              </Link>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">
                The all-in-one employee management platform that streamlines HR operations,
                payroll, and team collaboration with powerful AI-driven insights.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Github, href: '#', label: 'GitHub' },
                  { icon: Linkedin, href: '#', label: 'LinkedIn' },
                ].map((social) => (
                  <Link
                    key={social.label}
                    href={social.href}
                    className="group p-2.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Features', href: '/features' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Security', href: '#' },
                  { label: 'Integrations', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                {[
                  { label: 'About', href: '#' },
                  { label: 'Blog', href: '#' },
                  { label: 'Careers', href: '#' },
                  { label: 'Contact', href: '/contact' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Legal</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Privacy', href: '#' },
                  { label: 'Terms', href: '#' },
                  { label: 'Cookie Policy', href: '#' },
                  { label: 'Licenses', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2025 Zenora.ai. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                Status
              </Link>
              <Link href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
