/**
 * GET /api/manager/reports/team-summary
 * Get comprehensive team analytics and reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

// Cache key helper for manager reports
const getManagerReportCacheKey = (tenantId: string, userId: string, params: string) =>
  `manager:report:${tenantId}:${userId}:${params}`;


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

    // Only managers and admins can access reports
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const teamMemberId = searchParams.get('teamMember');
    const projectId = searchParams.get('project');

    // Build where clause
    const whereClause: any = {
      tenantId,
      workDate: {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate)),
      },
    };

    // Filter by team member if specified
    if (teamMemberId && teamMemberId !== 'all') {
      whereClause.userId = teamMemberId;
    }

    // Filter by project if specified
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }

    // If MANAGER role, only show their department's data
    if (role === 'MANAGER') {
      const manager = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (!manager?.departmentId) {
        return NextResponse.json(
          { success: false, error: 'Manager not assigned to a department' },
          { status: 400 }
        );
      }

      whereClause.user = {
        departmentId: manager.departmentId,
      };
    }

    // Create cache key based on query params
    const cacheKey = getManagerReportCacheKey(
      tenantId,
      userId,
      `${startDate}-${endDate}-${teamMemberId || 'all'}-${projectId || 'all'}`
    );

    // Use caching for team summary reports (3 min TTL)
    const reportData = await getCachedData(
      cacheKey,
      async () => fetchTeamSummaryData(whereClause, startDate, endDate),
      CacheTTL.REPORTS // 3 minutes
    );

    return NextResponse.json({
      success: true,
      ...reportData,
    });
  } catch (error) {
    console.error('[GET /api/manager/reports/team-summary] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch team summary data (called by cache layer)
 */
async function fetchTeamSummaryData(
  whereClause: any,
  startDate: string,
  endDate: string
) {
    // Fetch all timesheet entries for the period
    const entries = await prisma.timesheetEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
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
    });

    // Calculate summary stats
    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const billableHours = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0);

    // Standard work week: 40 hours
    const standardWeeklyHours = 40;
    const workingDays = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate),
    }).length;

    // Get unique team members
    const uniqueMembers = new Set(entries.map((e) => e.userId));
    const activeMembers = uniqueMembers.size;

    // Expected hours = members * days * 8 hours/day (or use working days)
    const expectedHours = activeMembers * workingDays * 8;
    const utilization = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

    // Overtime calculation (hours > 8 per day per person)
    const dailyHoursByMember = entries.reduce((acc: Record<string, number>, entry) => {
      const key = `${entry.userId}-${format(entry.workDate, 'yyyy-MM-dd')}`;
      acc[key] = (acc[key] || 0) + entry.hoursWorked;
      return acc;
    }, {} as Record<string, number>);

    const overtimeHours = Object.values(dailyHoursByMember).reduce((sum, hours) => {
      return sum + Math.max(0, hours - 8);
    }, 0);

    // Revenue calculation - use default rate of $100/hour for billable hours
    const revenue = billableHours * 100;

    const avgHoursPerMember = activeMembers > 0 ? totalHours / activeMembers : 0;

    // Team member performance breakdown
    const teamMemberMap = new Map<string, any>();

    entries.forEach((entry) => {
      const memberId = entry.user.id;

      if (!teamMemberMap.has(memberId)) {
        teamMemberMap.set(memberId, {
          userId: memberId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          totalHours: 0,
          billableHours: 0,
          overtimeHours: 0,
          projectCount: new Set(),
        });
      }

      const member = teamMemberMap.get(memberId);
      member.totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        member.billableHours += entry.hoursWorked;
      }
      if (entry.projectId) {
        member.projectCount.add(entry.projectId);
      }
    });

    // Calculate utilization and status for each member
    const teamMembers = Array.from(teamMemberMap.values()).map((member) => {
      const memberExpectedHours = workingDays * 8;
      const memberUtilization = memberExpectedHours > 0 ? (member.totalHours / memberExpectedHours) * 100 : 0;

      // Calculate member overtime
      const memberDailyHours = entries
        .filter((e) => e.userId === member.userId)
        .reduce((acc: any, entry) => {
          const dateKey = format(entry.workDate, 'yyyy-MM-dd');
          acc[dateKey] = (acc[dateKey] || 0) + entry.hoursWorked;
          return acc;
        }, {});

      const memberOvertimeHours = Object.values(memberDailyHours).reduce((sum: number, hours: any) => {
        return sum + Math.max(0, hours - 8);
      }, 0);

      let status: 'high' | 'normal' | 'low' = 'normal';
      if (memberUtilization >= 90) status = 'high';
      else if (memberUtilization < 50) status = 'low';

      return {
        ...member,
        utilization: memberUtilization,
        overtimeHours: memberOvertimeHours,
        projectCount: member.projectCount.size,
        status,
      };
    });

    // Project allocations
    const projectMap = new Map<string, any>();

    entries.forEach((entry) => {
      if (!entry.projectId) return;

      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, {
          projectId: entry.projectId,
          projectName: entry.project?.name || 'Unknown',
          projectCode: entry.project?.projectCode || 'N/A',
          totalHours: 0,
          billableHours: 0,
          teamMembers: new Set(),
        });
      }

      const project = projectMap.get(entry.projectId);
      project.totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        project.billableHours += entry.hoursWorked;
      }
      project.teamMembers.add(entry.userId);
    });

    const projectAllocations = Array.from(projectMap.values()).map((project) => ({
      ...project,
      teamMembers: project.teamMembers.size,
      // Use default rate of $100/hour for revenue calculation
      revenue: project.billableHours * 100,
    }));

    // Activity breakdown
    const activityMap = new Map<string, number>();

    entries.forEach((entry) => {
      const activity = entry.activityType || 'Other';
      activityMap.set(activity, (activityMap.get(activity) || 0) + entry.hoursWorked);
    });

    const activityBreakdown = Array.from(activityMap.entries()).map(([activityType, hours]) => ({
      activityType,
      hours,
      percentage: totalHours > 0 ? (hours / totalHours) * 100 : 0,
    }));

    // Daily trends
    const days = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate),
    });

    const dailyTrends = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter((e) => format(e.workDate, 'yyyy-MM-dd') === dateStr);

      return {
        date: dateStr,
        hours: dayEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
        billableHours: dayEntries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      };
    });

    // Generate alerts
    const alerts: any[] = [];

    // Check for overutilized team members
    const overutilized = teamMembers.filter((m) => m.utilization >= 100);
    if (overutilized.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${overutilized.length} team member(s) are overutilized (≥100%). Consider workload rebalancing.`,
      });
    }

    // Check for underutilized team members
    const underutilized = teamMembers.filter((m) => m.utilization < 50);
    if (underutilized.length > 0) {
      alerts.push({
        type: 'info',
        message: `${underutilized.length} team member(s) are underutilized (<50%). Consider additional project assignments.`,
      });
    }

    // Check for excessive overtime
    if (overtimeHours > totalHours * 0.1) {
      alerts.push({
        type: 'danger',
        message: `High overtime detected (${overtimeHours.toFixed(1)}h). This may indicate understaffing or unrealistic deadlines.`,
      });
    }

    // Check for low billable ratio
    const billableRatio = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    if (billableRatio < 60) {
      alerts.push({
        type: 'warning',
        message: `Low billable hours ratio (${billableRatio.toFixed(1)}%). Review non-billable activities.`,
      });
    }

    return {
      stats: {
        totalHours,
        billableHours,
        utilization,
        revenue,
        activeMembers,
        overtimeHours,
        submissionRate: 100, // Calculate based on expected submissions
        avgHoursPerMember,
      },
      teamMembers,
      projectAllocations,
      activityBreakdown,
      dailyTrends,
      alerts,
    };
}
