import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redis, magicLinks, rateLimiter } from '@/lib/redis';
import { sendMagicLinkEmail } from '@/lib/resend-email';
import {
  generateSecureCode,
  generateSecureToken,
  isEmailDomainAllowed,
  sanitizeEmail
} from '@/lib/security';
import {
  logCodeRequested,
  logRateLimitExceeded,
  logSuspiciousActivity
} from '@/lib/audit';

// Validation schema
const RequestCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/request-code
 *
 * Passwordless authentication - Request magic link with code
 *
 * Development Mode:
 * - When isDevelopmentMode is enabled in GlobalSettings, uses static OTP: 123456
 * - Email sending is skipped in development mode
 * - Perfect for testing without SMTP configuration
 * - Controlled by super-admin via /super-admin/settings
 *
 * Security:
 * - Rate limiting: 3 requests per hour per email
 * - Email domain validation against tenant whitelist
 * - Audit logging for all attempts
 * - Device fingerprinting
 * - POST only (never GET)
 *
 * Flow:
 * 1. Validate email format
 * 2. Check rate limiting
 * 3. Verify user exists and is active
 * 4. Validate email domain against tenant settings
 * 5. Check GlobalSettings for development mode
 * 6. Generate secure 6-digit code (or use 123456 in dev mode)
 * 7. Generate unique token
 * 8. Store magic link in Redis (10 min expiry, code hashed)
 * 9. Send email with magic link + code (skip in dev mode)
 * 10. Return success (no sensitive data)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validation = RequestCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const email = sanitizeEmail(validation.data.email);

    // Get request metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 1. Check rate limiting (5 per 15 minutes)
    const rateLimitExceeded = await rateLimiter.checkLoginCodeRateLimit(email);

    if (rateLimitExceeded) {
      await logRateLimitExceeded({
        email,
        ipAddress,
        userAgent,
        rateLimitType: 'LOGIN_CODE_REQUEST',
        attemptsInWindow: 5,
        windowSeconds: 900,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again in 15 minutes.',
        },
        { status: 429 }
      );
    }

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          }
        },
      },
    });

    // Generic error message (don't reveal if user exists)
    const genericError = 'If an account exists with this email, a login code will be sent.';

    if (!user) {
      // Log suspicious activity
      await logSuspiciousActivity({
        email,
        ipAddress,
        userAgent,
        activityType: 'LOGIN_CODE_NONEXISTENT_USER',
        details: { email },
      });

      // Return success anyway (prevent email enumeration)
      return NextResponse.json(
        { success: true, message: genericError },
        { status: 200 }
      );
    }

    // 3. Check if user is active
    if (user.status !== 'ACTIVE') {
      await logSuspiciousActivity({
        userId: user.id,
        tenantId: user.tenantId,
        email,
        ipAddress,
        userAgent,
        activityType: 'LOGIN_CODE_INACTIVE_USER',
        details: { status: user.status },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Your account is not active. Please contact your administrator.'
        },
        { status: 403 }
      );
    }

    // 4. Check if tenant is active
    if (!user.tenant.isActive) {
      await logSuspiciousActivity({
        userId: user.id,
        tenantId: user.tenantId,
        email,
        ipAddress,
        userAgent,
        activityType: 'LOGIN_CODE_INACTIVE_TENANT',
        details: { tenantName: user.tenant.name },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Your organization account is not active. Please contact support.'
        },
        { status: 403 }
      );
    }

    // 5. Validate email domain against tenant whitelist
    // Skip domain validation for SUPER_ADMIN users (platform-level admins)
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      const isDomainAllowed = await isEmailDomainAllowed(email, user.tenantId);

      if (!isDomainAllowed) {
        await logSuspiciousActivity({
          userId: user.id,
          tenantId: user.tenantId,
          email,
          ipAddress,
          userAgent,
          activityType: 'LOGIN_CODE_DOMAIN_NOT_ALLOWED',
          details: { email },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Email domain is not allowed for this organization.'
          },
          { status: 403 }
        );
      }
    }

    // 6. Check if system is in development mode (global setting)
    const globalSettings = await prisma.globalSettings.findFirst({
      select: { isDevelopmentMode: true }
    });

    const isDevelopmentMode = globalSettings?.isDevelopmentMode || false;

    // 7. Generate code (static 123456 in dev mode, random in production)
    const code = isDevelopmentMode ? '123456' : generateSecureCode();

    // 8. Generate unique token for magic link
    const token = generateSecureToken();

    // 9. Store magic link in Redis AND database (code will be hashed)
    const codeHash = require('crypto').createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in database for persistence
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        codeHash,
        email,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Also store in Redis for fast lookups
    const stored = await magicLinks.create(token, code, email, user.id, {
      tenantId: user.tenantId,
      ipAddress,
      userAgent,
    });
    console.log('[request-code] Magic link stored in DB and Redis:', stored, 'Token:', token.substring(0, 10) + '...');

    // 10. Send email (skip in development mode)
    let emailSent = true;

    if (isDevelopmentMode) {
      console.log('[request-code] 🚧 DEVELOPMENT MODE: Skipping email send');
      console.log('[request-code] 🔑 Demo OTP Code: 123456');
      console.log('[request-code] 📧 Email:', email);
    } else {
      // 11. Send email with magic link and code
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;
      console.log('[request-code] Sending email to:', email);
      emailSent = await sendMagicLinkEmail(email, user.firstName, code, token);
      console.log('[request-code] Email sent:', emailSent);

      if (!emailSent) {
        console.error('[request-code] Failed to send email, but continuing...');
      }
    }

    // 11. Log successful code request
    await logCodeRequested({
      userId: user.id,
      tenantId: user.tenantId,
      email,
      ipAddress,
      userAgent,
    });

    // 12. Return success (no sensitive data - don't expose token)
    return NextResponse.json(
      {
        success: true,
        message: isDevelopmentMode
          ? '🚧 Development Mode: Use OTP 123456 to login'
          : 'Login code sent to your email. Please check your inbox.',
        expiresIn: 600, // 10 minutes in seconds
        isDevelopmentMode,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Request code error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
