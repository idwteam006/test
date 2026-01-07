/**
 * Health Check API Route
 * Public endpoint to verify deployment and environment
 * No authentication required
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const envCheck = {
    // Database
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlStart: process.env.DATABASE_URL?.substring(0, 25) || 'missing',

    // Redis
    hasRedisUrl: !!process.env.REDIS_URL,
    redisUrlStart: process.env.REDIS_URL?.substring(0, 20) || 'missing',

    // JWT
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    hasJwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || 'missing',

    // App
    nodeEnv: process.env.NODE_ENV || 'missing',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing',
  };

  const allOk = envCheck.hasDatabaseUrl &&
                envCheck.hasRedisUrl &&
                envCheck.hasJwtSecret &&
                envCheck.hasJwtRefreshSecret;

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    deployment: 'vercel',
    checks: envCheck,
    message: allOk
      ? 'All critical environment variables are set'
      : 'Some critical environment variables are missing',
  });
}
