/**
 * GET /api/admin/timesheets/approved
 * Get approved timesheet entries for admin's direct reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only admins can access this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all APPROVED timesheet entries for the tenant
    const whereClause: any = {
      tenantId,
      status: 'APPROVED',
    };

    // Get the current user's employee record with manager info
    const currentUserEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true, managerId: true },
    });

    if (!currentUserEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 400 }
      );
    }

    // Check if current user is a root-level user (no manager)
    const isRootLevelUser = !currentUserEmployee.managerId;

    // Get direct reports only - same as manager
    const directReports = await prisma.employee.findMany({
      where: {
        tenantId: tenantId,
        managerId: currentUserEmployee.id,
      },
      select: { userId: true },
    });

    const directReportUserIds = directReports
      .map((emp) => emp.userId)
      .filter((id): id is string => id !== null);

    // Build the userId filter based on user's position in hierarchy
    // Root-level users can see their own self-approved timesheets
    if (isRootLevelUser && directReportUserIds.length === 0) {
      // Root-level user with no direct reports - show only their own approved timesheets
      whereClause.userId = userId;
    } else if (isRootLevelUser && directReportUserIds.length > 0) {
      // Root-level user with direct reports - show both own and direct reports' approved timesheets
      whereClause.userId = {
        in: [...directReportUserIds, userId],
      };
    } else if (directReportUserIds.length > 0) {
      // Regular admin with direct reports - show only direct reports' approved timesheets
      whereClause.userId = {
        in: directReportUserIds,
      };
    } else {
      // No direct reports and not root level - return empty
      return NextResponse.json({
        success: true,
        entries: [],
        count: 0,
      });
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      whereClause.workDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.workDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.workDate = {
        lte: new Date(endDate),
      };
    }

    // Fetch approved entries
    const approvedEntries = await prisma.timesheetEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        isBillable: true,
        billingAmount: true,
        description: true,
        approvedAt: true,
        approvedBy: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
      },
      orderBy: {
        approvedAt: 'desc',
      },
    });

    // Add isAutoApproved flag to each entry
    const entriesWithApprovalType = approvedEntries.map((entry) => ({
      ...entry,
      workDate: entry.workDate.toISOString().split('T')[0],
      isAutoApproved: entry.approvedBy === entry.user.id,
    }));

    return NextResponse.json({
      success: true,
      entries: entriesWithApprovalType,
      count: entriesWithApprovalType.length,
    });
  } catch (error) {
    console.error('[GET /api/admin/timesheets/approved] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch approved timesheets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
