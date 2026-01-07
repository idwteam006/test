/**
 * Prisma Client Instance
 * Optimized singleton pattern with connection pooling for serverless
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Reduce logging in development for better performance
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Ensure single instance in development (hot reload safe)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler for serverless environments
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
