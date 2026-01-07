import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { logLogout } from '@/lib/audit';

/**
 * POST /api/auth/logout
 *
 * End user session and clear authentication
 *
 * Security:
 * - Clears httpOnly session cookie
 * - Removes session from Redis
 * - Marks session as ended in database
 * - Audit logs the logout event
 *
 * Flow:
 * 1. Get session ID from cookie
 * 2. Get session data from Redis
 * 3. Delete session from Redis
 * 4. Update session record in database
 * 5. Clear session cookie
 * 6. Log logout event
 */
export async function POST(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      // No session to logout
      return NextResponse.json(
        {
          success: true,
          message: 'Already logged out'
        },
        { status: 200 }
      );
    }

    // Get session data from Redis (before deletion)
    const sessionData = await sessions.get(sessionId);

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Delete session from Redis
    await sessions.delete(sessionId);

    // Update session in database (mark as ended)
    if (sessionData) {
      await prisma.session.updateMany({
        where: {
          sessionId,
          userId: sessionData.userId,
        },
        data: {
          expiresAt: new Date(), // Set to now (expired)
          lastActivityAt: new Date(),
        },
      });

      // Log logout event
      await logLogout({
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        email: sessionData.email,
        ipAddress,
        userAgent,
      });
    }

    // Clear session cookie
    cookieStore.delete('session');

    // Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Logout error:', error);

    // Still try to clear the cookie even if there was an error
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during logout'
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
