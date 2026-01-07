'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, ChevronRight } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap-config';
import { useReducedMotion } from '@/hooks';
import { MagneticButton } from '../shared';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  onOpenContactModal: () => void;
}

const navItems: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar({ onOpenContactModal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP scroll-triggered animations
  useGSAP(() => {
    if (prefersReducedMotion || !logoRef.current) return;

    gsap.to(logoRef.current, {
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: '100px top',
        scrub: true,
      },
      scale: 0.9,
    });
  }, { scope: navRef });

  return (
    <>
      <motion.nav
        ref={navRef}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled ? 'py-2' : 'py-4'
        )}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={cn(
              'flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500',
              scrolled
                ? 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-lg shadow-slate-200/30'
                : ''
            )}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                ref={logoRef}
                className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-white font-black text-xl">Z</span>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              </motion.div>
              <span className="text-xl font-bold text-slate-900">
                Zenora
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  .ai
                </span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink key={item.label} href={item.href}>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
              <MagneticButton
                variant="primary"
                size="sm"
                onClick={onOpenContactModal}
              >
                Start Free Trial
                <ChevronRight className="w-4 h-4" />
              </MagneticButton>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl"
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="md:hidden mt-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl overflow-hidden"
              >
                <motion.div
                  className="p-6 space-y-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                >
                  {navItems.map((item) => (
                    <motion.div
                      key={item.label}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-slate-600 hover:text-indigo-600 py-2 font-medium"
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                  <motion.div
                    className="pt-4 border-t border-slate-200 space-y-3"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenContactModal();
                      }}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30"
                    >
                      Start Free Trial
                    </button>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    </>
  );
}

// Animated nav link with underline effect
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={linkRef}
      href={href}
      className="relative text-slate-600 hover:text-indigo-600 transition-colors text-sm font-medium group py-2"
    >
      {children}
      <motion.span
        className="absolute -bottom-0.5 left-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
        initial={{ width: '0%' }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </Link>
  );
}
