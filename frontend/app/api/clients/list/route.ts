import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * GET /api/clients/list
 *
 * Fetch all clients for the authenticated user's tenant
 *
 * Security:
 * - Requires authentication
 * - Only returns clients from user's tenant (multi-tenancy)
 * - Admin and Manager can view all clients
 * - Regular users can only see clients they manage
 *
 * Returns:
 * - List of clients with account manager info and project counts
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

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user details
    const session = await prisma.session.findFirst({
      where: { sessionId, userId: sessionData.userId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      );
    }

    const { user } = session;

    // Create cache key based on user role and tenant
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user.role);
    const cacheKey = `clients:list:${user.tenantId}:${isAdminOrManager ? 'all' : user.id}`;

    // Use caching for clients list (5 min TTL)
    const clientsData = await getCachedData(
      cacheKey,
      async () => fetchClientsList(user.tenantId, user.id, user.role),
      CacheTTL.CLIENTS // 5 minutes
    );

    return NextResponse.json({
      success: true,
      ...clientsData,
    });
  } catch (error) {
    console.error('List clients error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch clients',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch clients list (called by cache layer)
 */
async function fetchClientsList(tenantId: string, userId: string, role: string) {
    // Build query based on role
    const where: any = {
      tenantId,
    };

    // If not admin/manager, only show clients they manage
    if (!['ADMIN', 'MANAGER'].includes(role)) {
      where.accountManagerId = userId;
    }

    // Fetch clients with related data
    const clients = await prisma.client.findMany({
      where,
      include: {
        accountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        projects: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform clients to include project status counts
    const clientsWithProjectCounts = clients.map(client => {
      const projectsByStatus = {
        ACTIVE: client.projects.filter(p => p.status === 'ACTIVE').length,
        COMPLETED: client.projects.filter(p => p.status === 'COMPLETED').length,
        PLANNING: client.projects.filter(p => p.status === 'PLANNING').length,
        ON_HOLD: client.projects.filter(p => p.status === 'ON_HOLD').length,
        CANCELLED: client.projects.filter(p => p.status === 'CANCELLED').length,
      };

      const { projects, ...clientWithoutProjects } = client;

      return {
        ...clientWithoutProjects,
        projectsByStatus,
      };
    });

    return {
      clients: clientsWithProjectCounts,
      total: clientsWithProjectCounts.length,
    };
}
