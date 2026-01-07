import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health/db
 *
 * Database health check endpoint
 * Tests connection to PostgreSQL database
 */
export async function GET() {
  try {
    // Try to query the database
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - startTime;

    // Get database connection info (without password)
    const dbUrl = process.env.DATABASE_URL || '';
    const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        responseTime: `${duration}ms`,
        host: urlParts ? urlParts[3] : 'unknown',
        port: urlParts ? urlParts[4] : 'unknown',
        database: urlParts ? urlParts[5] : 'unknown',
        user: urlParts ? urlParts[1] : 'unknown',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Health] Database check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: {
          connected: false,
          error: error.message,
          code: error.code,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
