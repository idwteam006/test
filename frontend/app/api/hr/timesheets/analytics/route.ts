import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/hr/timesheets/analytics
 * Get comprehensive timesheet analytics for HR dashboard
 */
export async function GET(request: NextRequest) {
  try {
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

    // Only HR and Admin can access analytics
    if (!['ADMIN', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Default to current month
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : defaultStartDate;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : defaultEndDate;

    // Fetch all timesheet entries for the date range
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        tenantId: sessionData.tenantId,
        workDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employee: {
              select: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate summary metrics
    const totalSubmissions = entries.filter(e => e.status !== 'DRAFT').length;
    const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const billableHours = entries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const nonBillableHours = totalHours - billableHours;
    const totalRevenue = entries.reduce((sum, e) => sum + (e.billingAmount || 0), 0);
    const pendingApprovals = entries.filter(e => e.status === 'SUBMITTED').length;

    // Calculate average approval time (in hours)
    const approvedEntries = entries.filter(e => e.status === 'APPROVED' && e.approvedAt && e.submittedAt);
    let avgApprovalTime = 0;
    if (approvedEntries.length > 0) {
      const totalApprovalTime = approvedEntries.reduce((sum, e) => {
        const approvedAt = new Date(e.approvedAt!).getTime();
        const submittedAt = new Date(e.submittedAt!).getTime();
        return sum + (approvedAt - submittedAt);
      }, 0);
      avgApprovalTime = Math.round(totalApprovalTime / approvedEntries.length / (1000 * 60 * 60) * 10) / 10; // hours
    }

    // Status distribution
    const statusCounts: Record<string, number> = {};
    entries.forEach(e => {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    });
    const totalEntries = entries.length;
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100 * 10) / 10 : 0,
    }));

    // Submission trends (daily aggregation)
    const trendsMap: Record<string, { count: number; hours: number }> = {};
    entries.filter(e => e.status !== 'DRAFT').forEach(e => {
      const dateKey = e.workDate.toISOString().split('T')[0];
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { count: 0, hours: 0 };
      }
      trendsMap[dateKey].count += 1;
      trendsMap[dateKey].hours += e.hoursWorked || 0;
    });
    const submissionTrends = Object.entries(trendsMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        hours: Math.round(data.hours * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Department breakdown
    const deptMap: Record<string, { hours: number; employees: Set<string> }> = {};
    entries.forEach(e => {
      const deptName = e.user.employee?.department?.name || 'Unassigned';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { hours: 0, employees: new Set() };
      }
      deptMap[deptName].hours += e.hoursWorked || 0;
      deptMap[deptName].employees.add(e.userId);
    });
    const departmentBreakdown = Object.entries(deptMap)
      .map(([department, data]) => ({
        department,
        hours: Math.round(data.hours * 10) / 10,
        employees: data.employees.size,
      }))
      .sort((a, b) => b.hours - a.hours);

    // Project allocation
    const projectMap: Record<string, { name: string; hours: number }> = {};
    entries.forEach(e => {
      if (e.project) {
        const key = e.project.id;
        if (!projectMap[key]) {
          projectMap[key] = { name: e.project.name, hours: 0 };
        }
        projectMap[key].hours += e.hoursWorked || 0;
      }
    });
    const projectAllocation = Object.values(projectMap)
      .map(p => ({
        project: p.name,
        hours: Math.round(p.hours * 10) / 10,
        percentage: totalHours > 0 ? Math.round((p.hours / totalHours) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10 projects

    // Work type distribution
    const workTypeMap: Record<string, number> = {};
    entries.forEach(e => {
      const type = e.workType || 'REGULAR';
      workTypeMap[type] = (workTypeMap[type] || 0) + (e.hoursWorked || 0);
    });
    const workTypeDistribution = Object.entries(workTypeMap).map(([type, hours]) => ({
      type,
      hours: Math.round(hours * 10) / 10,
    }));

    // Employee compliance (check for missing submissions)
    const employeeMap: Record<string, {
      name: string;
      department: string;
      weeksSubmitted: Set<string>;
      totalHours: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    }> = {};

    entries.forEach(e => {
      const userId = e.userId;
      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          name: `${e.user.firstName} ${e.user.lastName}`,
          department: e.user.employee?.department?.name || 'Unassigned',
          weeksSubmitted: new Set(),
          totalHours: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        };
      }

      // Get week number
      const weekStart = new Date(e.workDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (e.status !== 'DRAFT') {
        employeeMap[userId].weeksSubmitted.add(weekKey);
      }
      employeeMap[userId].totalHours += e.hoursWorked || 0;

      if (e.status === 'SUBMITTED') employeeMap[userId].pendingCount++;
      if (e.status === 'APPROVED') employeeMap[userId].approvedCount++;
      if (e.status === 'REJECTED') employeeMap[userId].rejectedCount++;
    });

    // Calculate total weeks in the date range
    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    const employeeCompliance = Object.entries(employeeMap).map(([userId, data]) => ({
      userId,
      name: data.name,
      department: data.department,
      weeksSubmitted: data.weeksSubmitted.size,
      weeksMissing: Math.max(0, totalWeeks - data.weeksSubmitted.size),
      totalHours: Math.round(data.totalHours * 10) / 10,
      pendingCount: data.pendingCount,
      approvedCount: data.approvedCount,
      rejectedCount: data.rejectedCount,
      complianceRate: totalWeeks > 0
        ? Math.round((data.weeksSubmitted.size / totalWeeks) * 100)
        : 100,
    })).sort((a, b) => a.complianceRate - b.complianceRate);

    // Top rejection reasons
    const rejectionMap: Record<string, number> = {};
    entries.filter(e => e.status === 'REJECTED' && e.rejectionCategory).forEach(e => {
      const reason = e.rejectionCategory!;
      rejectionMap[reason] = (rejectionMap[reason] || 0) + 1;
    });
    const topRejectionReasons = Object.entries(rejectionMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Billable breakdown by department for bar chart
    const billableByDept: Record<string, { billable: number; nonBillable: number }> = {};
    entries.forEach(e => {
      const deptName = e.user.employee?.department?.name || 'Unassigned';
      if (!billableByDept[deptName]) {
        billableByDept[deptName] = { billable: 0, nonBillable: 0 };
      }
      if (e.isBillable) {
        billableByDept[deptName].billable += e.hoursWorked || 0;
      } else {
        billableByDept[deptName].nonBillable += e.hoursWorked || 0;
      }
    });
    const billableBreakdown = Object.entries(billableByDept)
      .map(([department, data]) => ({
        department,
        billable: Math.round(data.billable * 10) / 10,
        nonBillable: Math.round(data.nonBillable * 10) / 10,
      }))
      .sort((a, b) => (b.billable + b.nonBillable) - (a.billable + a.nonBillable));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSubmissions,
          totalHours: Math.round(totalHours * 10) / 10,
          billableHours: Math.round(billableHours * 10) / 10,
          nonBillableHours: Math.round(nonBillableHours * 10) / 10,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          pendingApprovals,
          avgApprovalTime,
          totalEntries: entries.length,
          approvalRate: totalSubmissions > 0
            ? Math.round((approvedEntries.length / totalSubmissions) * 100)
            : 0,
        },
        statusDistribution,
        submissionTrends,
        departmentBreakdown,
        projectAllocation,
        workTypeDistribution,
        employeeCompliance,
        topRejectionReasons,
        billableBreakdown,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Timesheet analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
