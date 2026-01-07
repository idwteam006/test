import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/timesheets
 * Fetch time entries for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Parse dates as UTC to avoid timezone issues
    // Adding T00:00:00.000Z ensures the date is interpreted as UTC midnight
    const startDateUTC = new Date(`${startDate}T00:00:00.000Z`);
    const endDateUTC = new Date(`${endDate}T23:59:59.999Z`);

    // Get total count for pagination
    const totalCount = await prisma.timesheetEntry.count({
      where: {
        userId: user.id,
        workDate: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
    });

    // Fetch timesheet entries with pagination
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        workDate: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
      include: {
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        workDate: 'desc',
      },
      skip,
      take: limit,
    });

    // Add isAutoApproved flag to entries and normalize workDate to YYYY-MM-DD format
    // This prevents timezone conversion issues on the client side
    const entriesWithApprovalInfo = entries.map((entry) => ({
      ...entry,
      workDate: entry.workDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      isAutoApproved: entry.status === 'APPROVED' && entry.approvedBy === user.id,
    }));

    // Calculate totals
    const totals = {
      totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
      billableHours: entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      nonBillableHours: entries.filter((e) => !e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      totalAmount: entries.reduce((sum, e) => sum + (e.billingAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      entries: entriesWithApprovalInfo,
      totals,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + entriesWithApprovalInfo.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Fetch timesheets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timesheets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/timesheets
 * Create a new time entry
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      workDate,
      projectId,
      taskId,
      startTime,
      endTime,
      hoursWorked,
      breakHours,
      workType,
      activityType,
      description,
      isBillable,
      billingRate,
      tags,
    } = body;

    // Validation
    if (!workDate || !hoursWorked || !description) {
      return NextResponse.json(
        { error: 'workDate, hoursWorked, and description are required' },
        { status: 400 }
      );
    }

    if (hoursWorked <= 0 || hoursWorked > 24) {
      return NextResponse.json(
        { error: 'hoursWorked must be between 0 and 24' },
        { status: 400 }
      );
    }

    // Validate projectId belongs to user's tenant
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { tenantId: true },
      });

      if (!project || project.tenantId !== user.tenantId) {
        return NextResponse.json(
          { error: 'Invalid project ID' },
          { status: 400 }
        );
      }
    }

    // Validate taskId belongs to user's tenant
    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { project: { select: { tenantId: true } } },
      });

      if (!task || task.project.tenantId !== user.tenantId) {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }
    }

    // Parse workDate as UTC to avoid timezone issues
    const workDateUTC = new Date(`${workDate}T00:00:00.000Z`);

    // Get tenant settings to check if future timesheets are allowed
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { allowFutureTimesheets: true },
    });

    // Validate work date is not in the future (unless allowed by settings)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (workDateUTC > today) {
      // Check if future timesheets are allowed
      if (!tenantSettings?.allowFutureTimesheets) {
        return NextResponse.json(
          { error: 'Work date cannot be in the future' },
          { status: 400 }
        );
      }
    }

    // Check for overlapping time entries on the same date
    if (startTime && endTime) {
      const overlappingEntries = await prisma.timesheetEntry.findFirst({
        where: {
          userId: user.id,
          workDate: workDateUTC,
          status: { notIn: ['REJECTED'] }, // Ignore rejected entries
          OR: [
            {
              AND: [
                { startTime: { not: null } },
                { endTime: { not: null } },
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
              ],
            },
          ],
        },
      });

      if (overlappingEntries) {
        return NextResponse.json(
          { error: 'Time entry overlaps with an existing entry on this date' },
          { status: 400 }
        );
      }
    }

    // Calculate billing amount
    let billingAmount = null;
    if (isBillable && billingRate) {
      billingAmount = hoursWorked * billingRate;
    }

    // Create timesheet entry
    const entry = await prisma.timesheetEntry.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: projectId || null,
        taskId: taskId || null,
        workDate: workDateUTC,
        startTime: startTime || null,
        endTime: endTime || null,
        hoursWorked,
        breakHours: breakHours || 0,
        workType: workType || 'REGULAR',
        activityType: activityType || null,
        description,
        isBillable: isBillable !== undefined ? isBillable : true,
        billingRate: billingRate || null,
        billingAmount,
        tags: tags || [],
        status: 'DRAFT',
      },
      include: {
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
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        workDate: entry.workDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      },
    });
  } catch (error) {
    console.error('Create timesheet entry error:', error);
    return NextResponse.json(
      { error: 'Failed to create timesheet entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
