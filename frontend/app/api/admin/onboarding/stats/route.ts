import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, CacheTTL } from '@/lib/cache';

// Cache key helper for onboarding stats
const getOnboardingStatsCacheKey = (tenantId: string) =>
  `onboarding:stats:${tenantId}`;

/**
 * GET /api/admin/onboarding/stats
 *
 * Get onboarding statistics for admin dashboard
 *
 * Returns:
 * - total: Total onboarding invites
 * - pending: Invites in PENDING or IN_PROGRESS status
 * - submitted: Invites in SUBMITTED status (awaiting review)
 * - approved: Invites in APPROVED status
 */
export async function GET(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check authorization
    if (sessionData.role !== 'ADMIN' && sessionData.role !== 'HR' && sessionData.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Create cache key
    const cacheKey = getOnboardingStatsCacheKey(sessionData.tenantId);

    // Use caching for onboarding stats (2 min TTL)
    const statsData = await getCachedData(
      cacheKey,
      async () => fetchOnboardingStats(sessionData.tenantId),
      120 // 2 minutes
    );

    return NextResponse.json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error('Get onboarding stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch onboarding statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch onboarding stats (called by cache layer)
 */
async function fetchOnboardingStats(tenantId: string) {
    // Get all onboarding invites for the tenant
    const invites = await prisma.onboardingInvite.findMany({
      where: {
        user: {
          tenantId,
        },
      },
      select: {
        status: true,
      },
    });

    // Calculate statistics
    const stats = {
      total: invites.length,
      pending: invites.filter(inv => inv.status === 'PENDING' || inv.status === 'IN_PROGRESS').length,
      submitted: invites.filter(inv => inv.status === 'SUBMITTED').length,
      approved: invites.filter(inv => inv.status === 'APPROVED').length,
      rejected: invites.filter(inv => inv.status === 'REJECTED').length,
    };

    return stats;
}
