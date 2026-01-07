import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/me
 *
 * Get current authenticated user information
 *
 * Security:
 * - Uses Redis session validation (not JWT)
 * - Validates session hasn't expired
 * - Refreshes session activity timestamp
 * - Returns user data without sensitive information
 *
 * Flow:
 * 1. Get session ID from cookie
 * 2. Get session data from Redis
 * 3. Refresh session activity timestamp
 * 4. Fetch user details from database
 * 5. Return user data
 */
export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      // Session expired or doesn't exist
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Refresh session activity (extends TTL)
    await sessions.refresh(sessionId);

    // Update last activity in database
    await prisma.session.updateMany({
      where: {
        sessionId,
        userId: sessionData.userId,
      },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
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
        emailVerified: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDevice: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            jobTitle: true,
            departmentId: true,
            managerId: true,
            employmentType: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Check if user is still active
    if (user.status !== 'ACTIVE') {
      // End session for inactive user
      await sessions.delete(sessionId);
      cookieStore.delete('session');

      return NextResponse.json(
        {
          success: false,
          error: 'Account is no longer active',
        },
        { status: 403 }
      );
    }

    // Check if tenant is still active
    if (!user.tenant.isActive) {
      // End session for inactive tenant
      await sessions.delete(sessionId);
      cookieStore.delete('session');

      return NextResponse.json(
        {
          success: false,
          error: 'Organization account is no longer active',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred',
      },
      { status: 500 }
    );
  }
}
