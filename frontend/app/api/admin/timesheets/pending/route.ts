/**
 * GET /api/admin/timesheets/pending
 * Get pending timesheet approvals for admin's direct reports
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
    const userIdFilter = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 500) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 500' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Get all SUBMITTED timesheet entries for the tenant
    const whereClause: any = {
      tenantId,
      status: 'SUBMITTED',
    };

    // Get the current user's employee record with manager info
    const currentUserEmployee = await prisma.employee.findFirst({
      where: {
        userId: userId,
        tenantId: tenantId,
      },
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

    // If no direct reports and not a root-level user, return empty
    if (directReportUserIds.length === 0 && !isRootLevelUser) {
      return NextResponse.json({
        success: true,
        entries: [],
        teamSummary: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Build the userId filter based on user's position in hierarchy
    if (isRootLevelUser && directReportUserIds.length === 0) {
      // Root-level user with no direct reports - no pending approvals to show here
      return NextResponse.json({
        success: true,
        entries: [],
        teamSummary: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    } else if (directReportUserIds.length > 0) {
      // User with direct reports - can only approve direct reports' timesheets
      whereClause.userId = {
        in: directReportUserIds,
      };
    } else {
      // No direct reports - return empty
      return NextResponse.json({
        success: true,
        entries: [],
        teamSummary: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Filter by specific user if requested
    if (userIdFilter) {
      whereClause.userId = userIdFilter;
    }

    // Filter by date range
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

    // Search functionality
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      whereClause.OR = [
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          user: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { employeeId: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
        {
          project: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { projectCode: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.timesheetEntry.count({
      where: whereClause,
    });

    // Fetch pending entries with user details
    const pendingEntries = await prisma.timesheetEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { submittedAt: 'desc' },
        { workDate: 'desc' },
      ],
      skip,
      take: limit,
    });

    // Calculate team summary
    const teamSummary = pendingEntries.reduce((acc: any, entry) => {
      const odUserId = entry.user.id;

      if (!acc[odUserId]) {
        acc[odUserId] = {
          odUserId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          department: entry.user.department?.name || 'N/A',
          pendingCount: 0,
          totalHours: 0,
          billableHours: 0,
        };
      }

      acc[odUserId].pendingCount += 1;
      acc[odUserId].totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        acc[odUserId].billableHours += entry.hoursWorked;
      }

      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      entries: pendingEntries.map(entry => ({
        ...entry,
        workDate: entry.workDate.toISOString().split('T')[0],
      })),
      teamSummary: Object.values(teamSummary),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + pendingEntries.length < totalCount,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/timesheets/pending] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending approvals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
