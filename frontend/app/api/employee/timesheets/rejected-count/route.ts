/**
 * GET /api/employee/timesheets/rejected-count
 * Get count of rejected timesheet entries for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count rejected entries for the current user
    const rejectedCount = await prisma.timesheetEntry.count({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        status: 'REJECTED',
      },
    });

    // Get rejected entries with details for notification list
    const rejectedEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        status: 'REJECTED',
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        rejectedReason: true,
        rejectionCategory: true,
        approvedAt: true,
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        approvedAt: 'desc',
      },
      take: 10, // Limit to most recent 10
    });

    return NextResponse.json({
      success: true,
      count: rejectedCount,
      entries: rejectedEntries,
    });
  } catch (error) {
    console.error('[GET /api/employee/timesheets/rejected-count] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rejected entries count',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
