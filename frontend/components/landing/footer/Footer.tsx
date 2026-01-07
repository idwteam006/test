'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Twitter, Github, Linkedin, ArrowUpRight } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../shared';

const footerLinks = {
  product: ['Features', 'Pricing', 'Demo', 'API Docs', 'Integrations'],
  company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  legal: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance', 'GDPR'],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: '-100px' });

  return (
    <footer ref={footerRef} className="relative bg-slate-900 text-white">
      {/* Animated gradient line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.5) 50%, transparent 100%)',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand column */}
          <StaggerContainer className="md:col-span-2" staggerDelay={0.1}>
            <StaggerItem animation="fadeUp">
              <Link href="/" className="flex items-center gap-3 mb-6 group">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className="text-white font-black text-xl">Z</span>
                </motion.div>
                <span className="text-xl font-bold">
                  Zenora<span className="text-indigo-400">.ai</span>
                </span>
              </Link>
            </StaggerItem>

            <StaggerItem animation="fadeUp">
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
                The all-in-one employee management platform for modern businesses.
                Trusted by thousands worldwide.
              </p>
            </StaggerItem>

            <StaggerItem animation="fadeUp">
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    className="p-2.5 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <StaggerContainer key={title} staggerDelay={0.05}>
              <StaggerItem animation="fadeUp">
                <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">
                  {title}
                </h4>
              </StaggerItem>
              <ul className="space-y-3">
                {links.map((link) => (
                  <StaggerItem key={link} animation="fadeUp">
                    <li>
                      <Link
                        href="#"
                        className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 group"
                      >
                        {link}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </li>
                  </StaggerItem>
                ))}
              </ul>
            </StaggerContainer>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          className="py-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Zenora.ai. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            {['Privacy', 'Terms', 'Cookies'].map((item) => (
              <Link
                key={item}
                href="#"
                className="hover:text-white transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
