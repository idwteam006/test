'use client';

import { useState } from 'react';
import {
  AuroraBackground,
  Navbar,
  HeroSection,
  StatsSection,
  FeaturesSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  Footer,
  ContactFormModal,
} from '@/components/landing';

export default function HomePage() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const openContactModal = () => setContactModalOpen(true);
  const closeContactModal = () => setContactModalOpen(false);

  return (
    <div className="min-h-screen text-slate-900 overflow-x-hidden">
      {/* Fixed background with aurora effect */}
      <AuroraBackground />

      {/* Navigation */}
      <Navbar onOpenContactModal={openContactModal} />

      {/* Hero Section */}
      <HeroSection onOpenContactModal={openContactModal} />

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Pricing Section */}
      <PricingSection onOpenContactModal={openContactModal} />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Final CTA Section */}
      <CTASection onOpenContactModal={openContactModal} />

      {/* Footer */}
      <Footer />

      {/* Contact Modal */}
      <ContactFormModal isOpen={contactModalOpen} onClose={closeContactModal} />
    </div>
  );
}
