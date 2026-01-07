import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, CacheTTL } from '@/lib/cache';

// Cache key helper for teams list
const getTeamsCacheKey = (tenantId: string) => `teams:list:${tenantId}`;

/**
 * GET /api/admin/teams
 * Fetch all teams in the organization
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

    // Create cache key
    const cacheKey = getTeamsCacheKey(sessionData.tenantId);

    // Use caching for teams list (5 min TTL)
    const teamsData = await getCachedData(
      cacheKey,
      async () => fetchTeamsList(sessionData.tenantId),
      CacheTTL.MEDIUM // 5 minutes
    );

    return NextResponse.json({
      success: true,
      ...teamsData,
    });
  } catch (error) {
    console.error('Fetch teams error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch teams list (called by cache layer)
 */
async function fetchTeamsList(tenantId: string) {
    // Fetch teams
    const teams = await prisma.team.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        teamLeadId: true,
        departmentId: true,
        teamType: true,
        teamLead: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        teamLeadId: team.teamLeadId,
        departmentId: team.departmentId,
        teamType: team.teamType,
        lead: team.teamLead
          ? {
              firstName: team.teamLead.user.firstName,
              lastName: team.teamLead.user.lastName,
            }
          : { firstName: 'Unassigned', lastName: '' },
        leadId: team.teamLeadId || '',
        department: team.department?.name,
        memberCount: team.members.length,
      })),
      total: teams.length,
    };
}
