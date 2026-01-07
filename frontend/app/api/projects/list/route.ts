import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * GET /api/projects/list
 *
 * Get list of projects for the current tenant
 *
 * Query Parameters:
 * - status: Filter by status (PLANNING, IN_PROGRESS, COMPLETED, etc.)
 * - clientId: Filter by client
 *
 * Security:
 * - Requires authentication
 * - Returns only projects from same tenant
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
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const clientIdFilter = searchParams.get('clientId');

    // Create cache key based on query params
    const cacheKey = `projects:list:${sessionData.tenantId}:${statusFilter || 'all'}:${clientIdFilter || 'all'}`;

    // Use caching for projects list (5 min TTL)
    const projectsData = await getCachedData(
      cacheKey,
      async () => fetchProjectsList(sessionData.tenantId, statusFilter, clientIdFilter),
      CacheTTL.PROJECTS // 5 minutes
    );

    return NextResponse.json({
      success: true,
      ...projectsData,
    });
  } catch (error) {
    console.error('Get projects list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch projects list (called by cache layer)
 */
async function fetchProjectsList(
  tenantId: string,
  statusFilter: string | null,
  clientIdFilter: string | null
) {
    // Build where clause
    const where: any = {
      tenantId,
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (clientIdFilter) {
      where.clientId = clientIdFilter;
    }

    // Fetch projects
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
          },
        },
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            timeEntries: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Projects loaded: ${projects.length} projects`);

    return {
      projects,
      count: projects.length,
    };
}
