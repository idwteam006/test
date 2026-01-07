import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * GET /api/hr/dashboard/stats
 *
 * Fetch comprehensive HR dashboard statistics including:
 * - Employee counts (total, active, on leave)
 * - Pending onboarding submissions
 * - Pending leave requests
 * - Expense overview
 * - Exit/resignation requests
 * - Timesheet compliance
 * - Upcoming holidays
 * - Recent activity
 *
 * Security:
 * - Requires HR, ADMIN, or MANAGER role
 * - Returns only data for the user's tenant
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

    // Check permissions
    if (!['ADMIN', 'HR', 'MANAGER'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const tenantId = sessionData.tenantId;

    // Use caching for dashboard stats (60 second TTL)
    const dashboardData = await getCachedData(
      CacheKeys.hrDashboard(tenantId),
      async () => fetchHRDashboardData(tenantId),
      CacheTTL.DASHBOARD // 60 seconds
    );

    return NextResponse.json({
      success: true,
      ...dashboardData,
    });
  } catch (error) {
    console.error('HR dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

/**
 * Fetch all HR dashboard data (called by cache layer)
 */
async function fetchHRDashboardData(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current week start/end for timesheet compliance
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekEnd = getWeekEnd(new Date());

    // Fetch all statistics in parallel
    const [
      // Employee stats
      totalEmployees,
      activeEmployees,
      pendingOnboardingCount,
      onLeaveToday,
      pendingLeaveRequests,
      pendingOnboardingList,
      pendingLeaveList,
      // Expense stats
      pendingExpenses,
      pendingExpensesList,
      expenseStats,
      // Exit stats
      exitStats,
      activeExitsList,
      // Timesheet stats
      timesheetStats,
      pendingTimesheets,
      // Holiday stats
      upcomingHolidays,
      // Activity
      recentActivity,
    ] = await Promise.all([
      // Total employees (users with employee records)
      prisma.employee.count({
        where: { tenantId },
      }),

      // Active employees
      prisma.employee.count({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
      }),

      // Pending onboarding count
      prisma.onboardingInvite.count({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
      }),

      // Employees on leave today
      prisma.leaveRequest.count({
        where: {
          tenantId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),

      // Pending leave requests count
      prisma.leaveRequest.count({
        where: {
          tenantId,
          status: 'PENDING',
        },
      }),

      // Pending onboarding list (top 5)
      prisma.onboardingInvite.findMany({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),

      // Pending leave requests list (top 5)
      prisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: 'PENDING',
        },
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
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Pending expenses count
      prisma.expenseClaim.count({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
      }),

      // Pending expenses list (top 5)
      prisma.expenseClaim.findMany({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
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
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Expense aggregate stats
      prisma.expenseClaim.aggregate({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Exit request stats
      getExitStats(tenantId),

      // Active exit requests list (top 5)
      prisma.exitRequest.findMany({
        where: {
          tenantId,
          status: { in: ['PENDING_MANAGER', 'MANAGER_APPROVED', 'HR_PROCESSING', 'CLEARANCE_PENDING'] },
        },
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
              department: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { lastWorkingDate: 'asc' },
        take: 5,
      }),

      // Timesheet compliance stats
      getTimesheetStats(tenantId, currentWeekStart, currentWeekEnd),

      // Pending timesheets count
      prisma.timesheetEntry.count({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
      }),

      // Upcoming holidays (next 5)
      prisma.holiday.findMany({
        where: {
          tenantId,
          date: { gte: today },
        },
        orderBy: { date: 'asc' },
        take: 5,
      }),

      // Recent activity - combine different activities
      getRecentActivity(tenantId),
    ]);

    // Transform pending onboarding for response
    const pendingOnboarding = pendingOnboardingList.map((invite) => ({
      id: invite.id,
      name: `${invite.firstName} ${invite.lastName}`,
      email: invite.email,
      status: invite.status,
      date: getRelativeTime(invite.completedAt || invite.createdAt),
      completedAt: invite.completedAt,
    }));

    // Transform leave requests for response
    const leaveRequests = pendingLeaveList.map((request) => ({
      id: request.id,
      name: `${request.employee.user.firstName} ${request.employee.user.lastName}`,
      email: request.employee.user.email,
      dates: formatDateRange(request.startDate, request.endDate),
      days: request.days,
      type: formatLeaveType(request.leaveType),
      leaveType: request.leaveType,
      reason: request.reason,
      createdAt: request.createdAt,
    }));

    // Transform expenses for response
    const expenses = pendingExpensesList.map((expense) => ({
      id: expense.id,
      name: `${expense.user.firstName} ${expense.user.lastName}`,
      email: expense.user.email,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: getRelativeTime(expense.createdAt),
      createdAt: expense.createdAt,
    }));

    // Transform exit requests for response
    const exitRequests = activeExitsList.map((exit) => ({
      id: exit.id,
      name: `${exit.employee.user.firstName} ${exit.employee.user.lastName}`,
      email: exit.employee.user.email,
      department: exit.employee.department?.name || 'N/A',
      lastWorkingDate: exit.lastWorkingDate,
      daysUntilExit: getDaysUntil(exit.lastWorkingDate),
      status: exit.status,
      statusLabel: formatExitStatus(exit.status),
      reasonCategory: exit.reasonCategory,
    }));

    // Transform holidays for response
    const holidays = upcomingHolidays.map((holiday) => ({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      formattedDate: formatHolidayDate(holiday.date),
      daysUntil: getDaysUntil(holiday.date),
      type: holiday.type,
      isOptional: holiday.isOptional,
    }));

    return {
      stats: {
        totalEmployees,
        activeEmployees,
        pendingOnboarding: pendingOnboardingCount,
        onLeave: onLeaveToday,
        pendingLeaveRequests,
        pendingExpenses,
        pendingExpenseAmount: expenseStats._sum.amount || 0,
        ...exitStats,
        ...timesheetStats,
        pendingTimesheets,
      },
      pendingOnboarding,
      leaveRequests,
      expenses,
      exitRequests,
      holidays,
      recentActivity,
    };
}

/**
 * Get exit request statistics
 */
async function getExitStats(tenantId: string) {
  const [pendingManager, managerApproved, hrProcessing, clearancePending, completed] = await Promise.all([
    prisma.exitRequest.count({ where: { tenantId, status: 'PENDING_MANAGER' } }),
    prisma.exitRequest.count({ where: { tenantId, status: 'MANAGER_APPROVED' } }),
    prisma.exitRequest.count({ where: { tenantId, status: 'HR_PROCESSING' } }),
    prisma.exitRequest.count({ where: { tenantId, status: 'CLEARANCE_PENDING' } }),
    prisma.exitRequest.count({ where: { tenantId, status: 'COMPLETED' } }),
  ]);

  return {
    exitPendingManager: pendingManager,
    exitManagerApproved: managerApproved,
    exitHrProcessing: hrProcessing,
    exitClearancePending: clearancePending,
    exitCompleted: completed,
    exitTotal: pendingManager + managerApproved + hrProcessing + clearancePending,
  };
}

/**
 * Get timesheet compliance statistics
 */
async function getTimesheetStats(tenantId: string, weekStart: Date, weekEnd: Date) {
  const [submitted, approved, rejected, totalEmployees] = await Promise.all([
    prisma.timesheetEntry.count({
      where: {
        tenantId,
        status: 'SUBMITTED',
      },
    }),
    prisma.timesheetEntry.count({
      where: {
        tenantId,
        status: 'APPROVED',
        workDate: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.timesheetEntry.count({
      where: {
        tenantId,
        status: 'REJECTED',
      },
    }),
    prisma.employee.count({
      where: { tenantId, status: 'ACTIVE' },
    }),
  ]);

  // Calculate compliance rate for current week
  const complianceRate = totalEmployees > 0
    ? Math.round((approved / totalEmployees) * 100)
    : 0;

  return {
    timesheetSubmitted: submitted,
    timesheetApproved: approved,
    timesheetRejected: rejected,
    timesheetComplianceRate: complianceRate,
  };
}

/**
 * Get recent activity from various sources
 */
async function getRecentActivity(tenantId: string) {
  const activities: any[] = [];

  // Get recent onboarding approvals
  const recentApprovals = await prisma.onboardingInvite.findMany({
    where: {
      tenantId,
      status: 'APPROVED',
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 2,
  });

  recentApprovals.forEach((approval) => {
    activities.push({
      id: `onboard-${approval.id}`,
      action: 'Employee onboarding approved',
      name: `${approval.firstName} ${approval.lastName}`,
      time: getRelativeTime(approval.updatedAt),
      timestamp: approval.updatedAt,
      type: 'onboarding_approved',
      icon: 'CheckCircle',
      color: 'text-green-600',
    });
  });

  // Get recent leave submissions
  const recentLeaveSubmissions = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  recentLeaveSubmissions.forEach((leave) => {
    activities.push({
      id: `leave-${leave.id}`,
      action: 'Leave request submitted',
      name: `${leave.employee.user.firstName} ${leave.employee.user.lastName}`,
      time: getRelativeTime(leave.createdAt),
      timestamp: leave.createdAt,
      type: 'leave_submitted',
      icon: 'Calendar',
      color: 'text-blue-600',
    });
  });

  // Get recent expense submissions
  const recentExpenses = await prisma.expenseClaim.findMany({
    where: {
      tenantId,
      status: 'SUBMITTED',
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  recentExpenses.forEach((expense) => {
    activities.push({
      id: `expense-${expense.id}`,
      action: 'Expense claim submitted',
      name: `${expense.user.firstName} ${expense.user.lastName}`,
      time: getRelativeTime(expense.createdAt),
      timestamp: expense.createdAt,
      type: 'expense_submitted',
      icon: 'Receipt',
      color: 'text-orange-600',
    });
  });

  // Get recent exit requests
  const recentExits = await prisma.exitRequest.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING_MANAGER', 'MANAGER_APPROVED', 'HR_PROCESSING'] },
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  recentExits.forEach((exit) => {
    activities.push({
      id: `exit-${exit.id}`,
      action: 'Resignation submitted',
      name: `${exit.employee.user.firstName} ${exit.employee.user.lastName}`,
      time: getRelativeTime(exit.createdAt),
      timestamp: exit.createdAt,
      type: 'exit_submitted',
      icon: 'UserMinus',
      color: 'text-red-600',
    });
  });

  // Get recent employee invites
  const recentInvites = await prisma.onboardingInvite.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  recentInvites.forEach((invite) => {
    activities.push({
      id: `invite-${invite.id}`,
      action: 'New employee invited',
      name: `${invite.firstName} ${invite.lastName}`,
      time: getRelativeTime(invite.createdAt),
      timestamp: invite.createdAt,
      type: 'employee_invited',
      icon: 'UserPlus',
      color: 'text-purple-600',
    });
  });

  // Get recent timesheet submissions
  const recentTimesheets = await prisma.timesheetEntry.findMany({
    where: {
      tenantId,
      status: 'SUBMITTED',
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 2,
  });

  recentTimesheets.forEach((ts) => {
    activities.push({
      id: `timesheet-${ts.id}`,
      action: 'Timesheet submitted',
      name: `${ts.user.firstName} ${ts.user.lastName}`,
      time: getRelativeTime(ts.submittedAt),
      timestamp: ts.submittedAt,
      type: 'timesheet_submitted',
      icon: 'Clock',
      color: 'text-indigo-600',
    });
  });

  // Sort by timestamp and take top 10
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, 10);
}

/**
 * Get start of current week (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of current week (Sunday)
 */
function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (start.getTime() === end.getTime()) {
    return start.toLocaleDateString('en-US', options);
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Format leave type for display
 */
function formatLeaveType(leaveType: string): string {
  const types: Record<string, string> = {
    ANNUAL: 'Annual Leave',
    SICK: 'Sick Leave',
    PERSONAL: 'Personal Leave',
    MATERNITY: 'Maternity Leave',
    PATERNITY: 'Paternity Leave',
    UNPAID: 'Unpaid Leave',
  };
  return types[leaveType] || leaveType;
}

/**
 * Format exit status for display
 */
function formatExitStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING_MANAGER: 'Pending Manager',
    MANAGER_APPROVED: 'Manager Approved',
    HR_PROCESSING: 'HR Processing',
    CLEARANCE_PENDING: 'Clearance Pending',
    COMPLETED: 'Completed',
  };
  return statuses[status] || status;
}

/**
 * Format holiday date for display
 */
function formatHolidayDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get days until a future date
 */
function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / 86400000);
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
