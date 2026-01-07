'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface ParticleFieldProps {
  particleCount?: number;
  className?: string;
}

export function ParticleField({
  particleCount = 8, // Reduced to 8 for minimal, professional look
  className = '',
}: ParticleFieldProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prefersReducedMotion = useReducedMotion();

  // Generate particles on mount - memoized to prevent unnecessary recalculations
  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 2, // Slightly smaller particles
      duration: Math.random() * 20 + 15, // Slower animations (15-35s instead of 10-25s)
      delay: Math.random() * 8, // More staggered delays
      opacity: Math.random() * 0.4 + 0.15, // Slightly reduced opacity
    }));
    setParticles(newParticles);
  }, [particleCount]);

  // Mouse interaction completely disabled for performance
  // The visual effect is maintained through the floating animation

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            // Simplified gradient - solid color with opacity
            backgroundColor: `rgba(99, 102, 241, ${particle.opacity})`,
          }}
          animate={{
            // Simplified animation - only Y movement and opacity (removed scale for performance)
            y: [0, -30, 0], // Reduced movement from -40 to -30
            opacity: [0, particle.opacity, 0],
          }}
          transition={{
            y: {
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut',
            },
            opacity: {
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut',
            },
          }}
        />
      ))}
    </div>
  );
}

// Professional floating decorative elements - small and subtle
export function FloatingShapes() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return null;
  }

  // Small decorative elements - professional and minimal
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Small floating plus signs */}
      <motion.div
        className="absolute top-[15%] left-[8%] text-indigo-300/40 text-2xl font-light"
        animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        +
      </motion.div>
      <motion.div
        className="absolute top-[25%] right-[12%] text-purple-300/40 text-xl font-light"
        animate={{ y: [0, -8, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        +
      </motion.div>

      {/* Small dots */}
      <motion.div
        className="absolute top-[40%] left-[5%] w-2 h-2 rounded-full bg-indigo-400/20"
        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[60%] right-[8%] w-1.5 h-1.5 rounded-full bg-purple-400/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Subtle line accents */}
      <motion.div
        className="absolute top-[30%] right-[5%] w-8 h-[1px] bg-gradient-to-r from-indigo-300/30 to-transparent"
        animate={{ opacity: [0.2, 0.5, 0.2], x: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[35%] left-[3%] w-6 h-[1px] bg-gradient-to-r from-purple-300/30 to-transparent"
        animate={{ opacity: [0.3, 0.5, 0.3], x: [0, 3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Small diamond shapes */}
      <motion.div
        className="absolute top-[70%] left-[10%] w-3 h-3 border border-indigo-300/20 rotate-45"
        animate={{ rotate: [45, 90, 45], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-[20%] right-[6%] w-2 h-2 border border-purple-300/20 rotate-45"
        animate={{ rotate: [45, 90, 45], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: 2 }}
      />
    </div>
  );
}
