import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfWeek, endOfWeek, eachWeekOfInterval, format } from 'date-fns';
import { getCachedData, CacheTTL } from '@/lib/cache';

// Cache key helper for utilization reports
const getUtilizationCacheKey = (tenantId: string, params: string) =>
  `utilization:report:${tenantId}:${params}`;

// GET /api/admin/reports/utilization - Employee utilization report
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endDate ? new Date(endDate) : endOfWeek(new Date(), { weekStartsOn: 1 });

    // Create cache key based on query params
    const cacheKey = getUtilizationCacheKey(
      user.tenantId,
      `${start.toISOString()}-${end.toISOString()}`
    );

    // Use caching for utilization reports (3 min TTL)
    const reportData = await getCachedData(
      cacheKey,
      async () => fetchUtilizationData(user.tenantId, start, end),
      CacheTTL.REPORTS // 3 minutes
    );

    return NextResponse.json({
      success: true,
      ...reportData,
    });
  } catch (error) {
    console.error('Error fetching utilization report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch utilization report' },
      { status: 500 }
    );
  }
}

/**
 * Fetch utilization data (called by cache layer)
 */
async function fetchUtilizationData(tenantId: string, start: Date, end: Date) {
    // Get all approved timesheet entries
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        tenantId,
        workDate: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['APPROVED', 'INVOICED'],
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate utilization per employee
    const utilizationByEmployee: Record<string, any> = {};

    entries.forEach((entry) => {
      const empKey = entry.user.employeeId || entry.user.email;
      if (!utilizationByEmployee[empKey]) {
        utilizationByEmployee[empKey] = {
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          email: entry.user.email,
          employeeId: entry.user.employeeId,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          utilizationRate: 0,
        };
      }

      utilizationByEmployee[empKey].totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        utilizationByEmployee[empKey].billableHours += entry.hoursWorked;
      } else {
        utilizationByEmployee[empKey].nonBillableHours += entry.hoursWorked;
      }
    });

    // Calculate utilization rate (billable hours / total hours * 100)
    Object.values(utilizationByEmployee).forEach((emp: any) => {
      emp.utilizationRate = emp.totalHours > 0
        ? Math.round((emp.billableHours / emp.totalHours) * 100)
        : 0;
    });

    const summary = {
      totalEmployees: Object.keys(utilizationByEmployee).length,
      totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
      totalBillableHours: entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      averageUtilization: Object.values(utilizationByEmployee).length > 0
        ? Math.round(
            Object.values(utilizationByEmployee).reduce((sum: number, emp: any) => sum + emp.utilizationRate, 0) /
              Object.values(utilizationByEmployee).length
          )
        : 0,
    };

    return {
      utilization: Object.values(utilizationByEmployee),
      summary,
    };
}
