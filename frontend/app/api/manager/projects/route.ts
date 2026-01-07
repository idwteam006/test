import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/manager/projects
 * Fetch projects for the manager's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch active projects
    const projects = await prisma.project.findMany({
      where: {
        tenantId: user.tenantId,
        status: {
          in: ['ACTIVE', 'PLANNING', 'ON_HOLD'],
        },
      },
      select: {
        id: true,
        name: true,
        projectCode: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      projects,
      total: projects.length,
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
