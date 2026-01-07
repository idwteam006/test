/**
 * Debug API Route
 * Check if environment variables are loaded
 * REMOVE THIS FILE IN PRODUCTION!
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      // Database
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'missing',

      // Redis
      hasRedisUrl: !!process.env.REDIS_URL,
      redisUrlPrefix: process.env.REDIS_URL?.substring(0, 15) || 'missing',

      // JWT
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      hasJwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
      jwtRefreshSecretLength: process.env.JWT_REFRESH_SECRET?.length || 0,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || 'missing',

      // AWS S3
      hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'missing',
      s3BucketName: process.env.S3_BUCKET_NAME || 'missing',

      // SMTP
      hasSmtpHost: !!process.env.SMTP_HOST,
      smtpHost: process.env.SMTP_HOST || 'missing',
      smtpPort: process.env.SMTP_PORT || 'missing',

      // App Config
      nodeEnv: process.env.NODE_ENV,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing',
      nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'missing',
    },
    message: 'Environment variables check complete. Remove this API route in production!',
  });
}
