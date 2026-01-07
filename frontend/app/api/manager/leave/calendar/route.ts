import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

// GET /api/manager/leave/calendar - Get team leave calendar
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    const departmentId = searchParams.get('departmentId');

    // Parse month or default to current month
    const targetDate = month ? new Date(`${month}-01`) : new Date();
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Get manager's employee record (if applicable)
    let managerEmployeeId: string | null = null;
    if (user.role === 'MANAGER') {
      const managerEmployee = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      managerEmployeeId = managerEmployee?.id || null;
    }

    // Build query for team members
    const whereClause: any = {
      tenantId: user.tenantId,
      status: 'ACTIVE',
    };

    // Filter by department if specified
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    // If manager, only show their direct reports
    if (user.role === 'MANAGER' && managerEmployeeId) {
      whereClause.managerId = managerEmployeeId;
    }

    // Get team members
    const teamMembers = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    if (teamMembers.length === 0) {
      return NextResponse.json({
        success: true,
        month: format(targetDate, 'yyyy-MM'),
        teamSize: 0,
        teamMembers: [],
        leaveRequests: [],
        calendar: [],
        coverage: {},
      });
    }

    const employeeIds = teamMembers.map((e) => e.id);

    // Get all leave requests for the team in this month
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: monthEnd } },
              { endDate: { gte: monthStart } },
            ],
          },
        ],
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Build calendar data
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const calendar = daysInMonth.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Find all employees on leave this day
      const employeesOnLeave = leaveRequests.filter((req) => {
        const requestStart = new Date(req.startDate);
        const requestEnd = new Date(req.endDate);
        return date >= requestStart && date <= requestEnd;
      });

      return {
        date: dateStr,
        dayOfWeek: format(date, 'EEE'),
        employeesOnLeave: employeesOnLeave.map((req) => ({
          employeeId: req.employee.id,
          employeeName: `${req.employee.user.firstName} ${req.employee.user.lastName}`,
          employeeNumber: req.employee.user.employeeId,
          leaveType: req.leaveType,
          status: req.status,
          requestId: req.id,
        })),
        onLeaveCount: employeesOnLeave.length,
        availableCount: teamMembers.length - employeesOnLeave.length,
        coveragePercentage: ((teamMembers.length - employeesOnLeave.length) / teamMembers.length) * 100,
      };
    });

    // Calculate coverage warnings
    const coverage = {
      critical: calendar.filter((day) => day.coveragePercentage < 50).length,
      warning: calendar.filter((day) => day.coveragePercentage >= 50 && day.coveragePercentage < 75).length,
      good: calendar.filter((day) => day.coveragePercentage >= 75).length,
    };

    // Find days with most people on leave
    const peakLeaveDays = calendar
      .filter((day) => day.onLeaveCount > 0)
      .sort((a, b) => b.onLeaveCount - a.onLeaveCount)
      .slice(0, 5);

    // Team member summary
    const teamSummary = teamMembers.map((member) => {
      const memberLeaves = leaveRequests.filter((req) => req.employeeId === member.id);
      const totalDays = memberLeaves.reduce((sum, req) => sum + req.days, 0);

      return {
        employeeId: member.id,
        employeeName: `${member.user.firstName} ${member.user.lastName}`,
        employeeNumber: member.user.employeeId,
        email: member.user.email,
        department: member.department?.name,
        leaveCount: memberLeaves.length,
        totalDays,
        leaves: memberLeaves.map((req) => ({
          id: req.id,
          leaveType: req.leaveType,
          startDate: format(new Date(req.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(req.endDate), 'yyyy-MM-dd'),
          days: req.days,
          status: req.status,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      month: format(targetDate, 'yyyy-MM'),
      teamSize: teamMembers.length,
      teamMembers: teamSummary,
      calendar,
      coverage,
      peakLeaveDays,
      stats: {
        totalRequests: leaveRequests.length,
        pending: leaveRequests.filter((r) => r.status === 'PENDING').length,
        approved: leaveRequests.filter((r) => r.status === 'APPROVED').length,
        totalDays: leaveRequests.reduce((sum, req) => sum + req.days, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching team calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team calendar' },
      { status: 500 }
    );
  }
}
