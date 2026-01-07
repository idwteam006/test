import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfYear, endOfYear, format } from 'date-fns';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

// GET /api/admin/leave/reports - Get comprehensive leave reports and analytics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const departmentId = searchParams.get('departmentId');
    const reportType = searchParams.get('type') || 'summary';

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Create cache key based on params
    const cacheKey = CacheKeys.leaveReport(
      user.tenantId,
      `${year}-${departmentId || 'all'}-${reportType}`
    );

    // Use caching for leave reports (5 min TTL)
    const reportData = await getCachedData(
      cacheKey,
      async () => fetchLeaveReportData(user.tenantId, year, yearStart, yearEnd, departmentId, reportType),
      CacheTTL.MEDIUM // 5 minutes
    );

    // Handle invalid report type
    if (!reportData) {
      return NextResponse.json(
        { success: false, error: 'Invalid report type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...reportData,
    });
  } catch (error) {
    console.error('Error generating leave report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate leave report' },
      { status: 500 }
    );
  }
}

/**
 * Fetch leave report data (called by cache layer)
 */
async function fetchLeaveReportData(
  tenantId: string,
  year: number,
  yearStart: Date,
  yearEnd: Date,
  departmentId: string | null,
  reportType: string
) {
    // Build base query
    const whereClause: any = {
      tenantId,
    };

    if (departmentId) {
      whereClause.employee = {
        departmentId,
      };
    }

    // Get all leave requests for the year
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        ...whereClause,
        startDate: {
          gte: yearStart,
          lte: yearEnd,
        },
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
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get all employees
    const employeeWhereClause: any = {
      tenantId,
      status: 'ACTIVE',
    };

    if (departmentId) {
      employeeWhereClause.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        leaveBalances: {
          where: { year },
        },
      },
    });

    // Summary Report
    if (reportType === 'summary') {
      const totalRequests = leaveRequests.length;
      const approvedRequests = leaveRequests.filter((r) => r.status === 'APPROVED');
      const rejectedRequests = leaveRequests.filter((r) => r.status === 'REJECTED');
      const pendingRequests = leaveRequests.filter((r) => r.status === 'PENDING');

      const totalDaysTaken = approvedRequests.reduce((sum, r) => sum + r.days, 0);
      const totalDaysRequested = leaveRequests.reduce((sum, r) => sum + r.days, 0);

      // By leave type
      const byLeaveType = leaveRequests.reduce((acc: any, req) => {
        if (!acc[req.leaveType]) {
          acc[req.leaveType] = {
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            days: 0,
          };
        }
        acc[req.leaveType].total++;
        acc[req.leaveType][req.status.toLowerCase()]++;
        if (req.status === 'APPROVED') {
          acc[req.leaveType].days += req.days;
        }
        return acc;
      }, {});

      // By month
      const byMonth = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthRequests = approvedRequests.filter((r) => {
          const startMonth = new Date(r.startDate).getMonth() + 1;
          return startMonth === month;
        });
        return {
          month,
          monthName: format(new Date(year, i, 1), 'MMMM'),
          requests: monthRequests.length,
          days: monthRequests.reduce((sum, r) => sum + r.days, 0),
        };
      });

      // By department
      const byDepartment = employees.reduce((acc: any, emp) => {
        const deptName = emp.department?.name || 'No Department';
        if (!acc[deptName]) {
          acc[deptName] = {
            employees: 0,
            requests: 0,
            days: 0,
          };
        }
        acc[deptName].employees++;

        const empRequests = approvedRequests.filter((r) => r.employeeId === emp.id);
        acc[deptName].requests += empRequests.length;
        acc[deptName].days += empRequests.reduce((sum, r) => sum + r.days, 0);

        return acc;
      }, {});

      // Top leave takers
      const employeeStats = employees.map((emp) => {
        const empRequests = approvedRequests.filter((r) => r.employeeId === emp.id);
        const totalDays = empRequests.reduce((sum, r) => sum + r.days, 0);
        const totalBalance = emp.leaveBalances.reduce((sum, b) => sum + b.balance, 0);

        return {
          employeeId: emp.id,
          employeeName: `${emp.user.firstName} ${emp.user.lastName}`,
          employeeNumber: emp.user.employeeId,
          department: emp.department?.name,
          requestCount: empRequests.length,
          daysTaken: totalDays,
          remainingBalance: totalBalance,
        };
      });

      const topLeaveTakers = employeeStats
        .sort((a, b) => b.daysTaken - a.daysTaken)
        .slice(0, 10);

      // Approval turnaround time
      const approvalTimes = approvedRequests
        .filter((r) => r.approvedAt && r.submittedAt)
        .map((r) => {
          const submitted = new Date(r.submittedAt!).getTime();
          const approved = new Date(r.approvedAt!).getTime();
          return Math.ceil((approved - submitted) / (1000 * 60 * 60 * 24)); // Days
        });

      const avgApprovalTime = approvalTimes.length > 0
        ? Math.round(approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length)
        : 0;

      // Rejection analysis
      const rejectionReasons = rejectedRequests.reduce((acc: any, req) => {
        const category = req.rejectionCategory || 'OTHER';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      return {
        year,
        reportType: 'summary',
        summary: {
          totalEmployees: employees.length,
          totalRequests,
          approvedRequests: approvedRequests.length,
          rejectedRequests: rejectedRequests.length,
          pendingRequests: pendingRequests.length,
          totalDaysTaken,
          totalDaysRequested,
          approvalRate: totalRequests > 0 ? Math.round((approvedRequests.length / totalRequests) * 100) : 0,
          avgApprovalTime,
        },
        byLeaveType,
        byMonth,
        byDepartment,
        topLeaveTakers,
        rejectionReasons,
        generatedAt: new Date().toISOString(),
      };
    }

    // Detailed Employee Report
    if (reportType === 'employee-detail') {
      const employeeDetails = employees.map((emp) => {
        const empRequests = leaveRequests.filter((r) => r.employeeId === emp.id);

        return {
          employeeId: emp.id,
          employeeName: `${emp.user.firstName} ${emp.user.lastName}`,
          employeeNumber: emp.user.employeeId,
          department: emp.department?.name,
          startDate: emp.startDate,
          leaveRequests: empRequests.map((req) => ({
            id: req.id,
            leaveType: req.leaveType,
            startDate: format(new Date(req.startDate), 'yyyy-MM-dd'),
            endDate: format(new Date(req.endDate), 'yyyy-MM-dd'),
            days: req.days,
            status: req.status,
            submittedAt: req.submittedAt ? format(new Date(req.submittedAt), 'yyyy-MM-dd') : null,
            approvedAt: req.approvedAt ? format(new Date(req.approvedAt), 'yyyy-MM-dd') : null,
            rejectionReason: req.rejectedReason,
          })),
          balances: emp.leaveBalances.map((bal) => ({
            leaveType: bal.leaveType,
            balance: bal.balance,
            year: bal.year,
          })),
          stats: {
            totalRequests: empRequests.length,
            approved: empRequests.filter((r) => r.status === 'APPROVED').length,
            rejected: empRequests.filter((r) => r.status === 'REJECTED').length,
            pending: empRequests.filter((r) => r.status === 'PENDING').length,
            totalDays: empRequests
              .filter((r) => r.status === 'APPROVED')
              .reduce((sum, r) => sum + r.days, 0),
          },
        };
      });

      return {
        year,
        reportType: 'employee-detail',
        employees: employeeDetails,
        generatedAt: new Date().toISOString(),
      };
    }

    // Utilization Report
    if (reportType === 'utilization') {
      const utilizationData = employees.map((emp) => {
        const empApprovedRequests = leaveRequests.filter(
          (r) => r.employeeId === emp.id && r.status === 'APPROVED'
        );
        const daysTaken = empApprovedRequests.reduce((sum, r) => sum + r.days, 0);

        // Calculate total allocation for this employee
        const totalAllocation = emp.leaveBalances.reduce((sum, b) => {
          // Get original allocation (current balance + days taken)
          if (b.leaveType === 'ANNUAL' || b.leaveType === 'SICK' || b.leaveType === 'PERSONAL') {
            return sum + b.balance + empApprovedRequests
              .filter((r) => r.leaveType === b.leaveType)
              .reduce((s, r) => s + r.days, 0);
          }
          return sum;
        }, 0);

        const utilizationRate = totalAllocation > 0 ? (daysTaken / totalAllocation) * 100 : 0;

        return {
          employeeId: emp.id,
          employeeName: `${emp.user.firstName} ${emp.user.lastName}`,
          employeeNumber: emp.user.employeeId,
          department: emp.department?.name,
          totalAllocation,
          daysTaken,
          remainingDays: emp.leaveBalances.reduce((sum, b) => sum + b.balance, 0),
          utilizationRate: Math.round(utilizationRate),
        };
      });

      // Categorize by utilization
      const lowUtilization = utilizationData.filter((u) => u.utilizationRate < 30);
      const mediumUtilization = utilizationData.filter(
        (u) => u.utilizationRate >= 30 && u.utilizationRate < 70
      );
      const highUtilization = utilizationData.filter((u) => u.utilizationRate >= 70);

      return {
        year,
        reportType: 'utilization',
        utilizationData,
        categories: {
          low: { count: lowUtilization.length, employees: lowUtilization },
          medium: { count: mediumUtilization.length, employees: mediumUtilization },
          high: { count: highUtilization.length, employees: highUtilization },
        },
        generatedAt: new Date().toISOString(),
      };
    }

    // Invalid report type - return null and let the main handler deal with it
    return null;
}
