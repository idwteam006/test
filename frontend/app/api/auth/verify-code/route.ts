import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { magicLinks, rateLimiter, sessions } from '@/lib/redis';
import {
  logLoginSuccess,
  logLoginFailed,
  logRateLimitExceeded
} from '@/lib/audit';
import { cookies } from 'next/headers';

// Generate device fingerprint
function generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
  return crypto.createHash('sha256').update(`${ipAddress}:${userAgent}`).digest('hex');
}

// Validation schema - allow either token OR email
const VerifyCodeSchema = z.object({
  token: z.string().min(20).optional(),  // Token must be at least 20 chars if provided
  email: z.string().email().optional(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
}).refine(data => {
  // Check that either a valid token or valid email is provided
  const hasValidToken = data.token && data.token !== 'undefined' && data.token !== 'null' && data.token.length >= 20;
  const hasValidEmail = data.email && data.email !== 'undefined' && data.email.includes('@');
  return hasValidToken || hasValidEmail;
}, {
  message: 'Either a valid token or email is required',
  path: ['token'],
});

/**
 * POST /api/auth/verify-code
 *
 * Verify 6-digit code and create authenticated session
 *
 * Security:
 * - Rate limiting: 5 verification attempts per token
 * - Timing-safe code comparison
 * - One-time use tokens
 * - 10-minute token expiry
 * - Device fingerprinting
 * - httpOnly secure cookies
 * - POST only (never GET)
 *
 * Flow:
 * 1. Validate input (token + code)
 * 2. Check verification rate limiting
 * 3. Get magic link from Redis
 * 4. Verify code (timing-safe comparison)
 * 5. Mark magic link as used
 * 6. Create authenticated session in Redis
 * 7. Set httpOnly session cookie
 * 8. Update user last login metadata
 * 9. Return user data
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    console.log('[verify-code] Received body:', { token: body.token?.substring(0, 10) + '...', code: body.code });

    const validation = VerifyCodeSchema.safeParse(body);

    if (!validation.success) {
      console.error('[verify-code] Validation failed:', validation.error.format());
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token or code format',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { token, email, code } = validation.data;

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 1. Check verification rate limiting (5 attempts per 15 minutes)
    const rateLimitKey = token || email || 'unknown';
    const rateLimitExceeded = await rateLimiter.checkVerificationRateLimit(rateLimitKey);

    if (rateLimitExceeded) {
      await logRateLimitExceeded({
        ipAddress,
        userAgent,
        rateLimitType: 'CODE_VERIFICATION',
        attemptsInWindow: 5,
        windowSeconds: 900,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification attempts. Please request a new code.',
        },
        { status: 429 }
      );
    }

    // 2. Get magic link from Redis (fast) or Database (fallback)
    let magicLink = token ? await magicLinks.get(token) : null;
    let dbMagicLink = null;

    // If token provided, check Redis first then database
    if (token && !magicLink) {
      console.log('[verify-code] Token provided, not in Redis, checking database...');
      dbMagicLink = await prisma.magicLink.findUnique({
        where: { token },
        include: { user: { select: { tenantId: true } } },
      });
    }
    // If email provided, lookup most recent magic link from database
    else if (email && !token) {
      console.log('[verify-code] Email provided, looking up most recent magic link...');
      dbMagicLink = await prisma.magicLink.findFirst({
        where: {
          email,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { tenantId: true } } },
      });
    }

    // Convert DB magic link to Redis format if found
    if (!magicLink && dbMagicLink) {
      if (dbMagicLink.isUsed || dbMagicLink.expiresAt < new Date()) {
        await logLoginFailed({
          email: email || 'unknown',
          ipAddress,
          userAgent,
          reason: 'INVALID_OR_EXPIRED_TOKEN',
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or expired verification code. Please request a new code.',
          },
          { status: 400 }
        );
      }

      // Convert DB format to Redis format
      magicLink = {
        token: dbMagicLink.token,
        codeHash: dbMagicLink.codeHash,
        email: dbMagicLink.email,
        userId: dbMagicLink.userId,
        tenantId: dbMagicLink.user.tenantId,
        attempts: dbMagicLink.attempts,
        ipAddress: dbMagicLink.ipAddress,
        userAgent: dbMagicLink.userAgent,
        deviceFingerprint: undefined,
        expiresAt: dbMagicLink.expiresAt.getTime(),
        createdAt: Date.now(),
      };
      console.log('[verify-code] Found in database, converted to Redis format');
    }

    // Check if magic link was found
    if (!magicLink) {
      await logLoginFailed({
        email: email || 'unknown',
        ipAddress,
        userAgent,
        reason: 'MAGIC_LINK_NOT_FOUND',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No verification code found. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 3. Verify code (timing-safe comparison)
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const isValidCode = crypto.timingSafeEqual(
      Buffer.from(codeHash),
      Buffer.from(magicLink.codeHash)
    );

    if (!isValidCode) {
      // Increment failed attempts in database
      if (dbMagicLink) {
        await prisma.magicLink.update({
          where: { token: dbMagicLink.token },
          data: { attempts: { increment: 1 } },
        });
      }
      // Also increment in Redis if token provided
      if (token) {
        await magicLinks.incrementAttempts(token);
      }

      // Log failed attempt
      await logLoginFailed({
        userId: magicLink.userId,
        tenantId: magicLink.tenantId,
        email: magicLink.email,
        ipAddress,
        userAgent,
        reason: 'INVALID_CODE',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verification code. Please try again.',
          attemptsRemaining: Math.max(0, 5 - (magicLink.attempts + 1)),
        },
        { status: 400 }
      );
    }

    // 5. Get user details
    const user = await prisma.user.findUnique({
      where: { id: magicLink.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        departmentId: true,
        avatarUrl: true,
        employeeId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!user) {
      await logLoginFailed({
        userId: magicLink.userId,
        tenantId: magicLink.tenantId,
        email: magicLink.email,
        ipAddress,
        userAgent,
        reason: 'USER_NOT_FOUND',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please contact your administrator.',
        },
        { status: 404 }
      );
    }

    // 6. Check user status
    if (user.status !== 'ACTIVE') {
      await logLoginFailed({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        ipAddress,
        userAgent,
        reason: 'USER_NOT_ACTIVE',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Your account is not active. Please contact your administrator.',
        },
        { status: 403 }
      );
    }

    // 7. Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(ipAddress, userAgent);

    // 8. Create session in Redis (8-hour duration)
    const sessionId = await sessions.create(
      user.id,
      user.tenantId,
      user.email,
      user.role,
      user.status,
      {
        ipAddress,
        userAgent,
        deviceFingerprint,
      }
    );

    // 9. Mark magic link as used in database and delete from Redis
    await prisma.magicLink.update({
      where: { token: magicLink.token },
      data: { isUsed: true },
    });
    if (token) {
      await magicLinks.delete(token);
    }

    // 10. Create session record in database
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        lastActivityAt: new Date(),
      },
    });

    // 11. Update user last login metadata
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: userAgent.substring(0, 255), // Truncate if too long
      },
    });

    // 12. Log successful login
    await logLoginSuccess({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      ipAddress,
      userAgent,
      deviceFingerprint,
    });

    // 13. Set httpOnly secure session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    // 14. Return user data (no sensitive information)
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          employeeId: user.employeeId,
          avatarUrl: user.avatarUrl,
          tenant: user.tenant,
          department: user.department,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Verify code error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during verification. Please try again.'
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
