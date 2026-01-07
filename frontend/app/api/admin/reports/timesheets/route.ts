import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { getCachedData, CacheKeys } from '@/lib/cache';

// GET /api/admin/reports/timesheets - Timesheet summary report
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT' && user.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    // Create cache key from search params
    const cacheKey = CacheKeys.timesheetReport(user.tenantId, searchParams.toString());

    // Use cached data with 5-minute TTL
    const data = await getCachedData(
      cacheKey,
      async () => {
        const where: any = {
          tenantId: user.tenantId,
        };

        if (startDate && endDate) {
          where.workDate = {
            gte: new Date(startDate),
            lte: new Date(endDate),
          };
        }

        if (status) {
          where.status = status;
        }

        if (projectId) {
          where.projectId = projectId;
        }

        // Run count and findMany in parallel for better performance
        const [entries, totalCount] = await Promise.all([
          prisma.timesheetEntry.findMany({
            where,
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
                  projectCode: true,
                  client: {
                    select: {
                      companyName: true,
                    },
                  },
                },
              },
              task: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              workDate: 'desc',
            },
            take: limit,
            skip: skip,
          }),
          prisma.timesheetEntry.count({ where }),
        ]);

    // Calculate summary statistics
    const summary = {
      totalEntries: entries.length,
      totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
      billableHours: entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      nonBillableHours: entries.filter((e) => !e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
      totalRevenue: entries.reduce((sum, e) => sum + (e.billingAmount || 0), 0),
      byStatus: {
        draft: entries.filter((e) => e.status === 'DRAFT').length,
        submitted: entries.filter((e) => e.status === 'SUBMITTED').length,
        approved: entries.filter((e) => e.status === 'APPROVED').length,
        rejected: entries.filter((e) => e.status === 'REJECTED').length,
        invoiced: entries.filter((e) => e.status === 'INVOICED').length,
      },
      byEmployee: {} as Record<string, { name: string; hours: number; billable: number }>,
      byProject: {} as Record<string, { name: string; hours: number; revenue: number }>,
    };

    // Group by employee
    entries.forEach((entry) => {
      const empKey = entry.user.employeeId || entry.user.email;
      if (!summary.byEmployee[empKey]) {
        summary.byEmployee[empKey] = {
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          hours: 0,
          billable: 0,
        };
      }
      summary.byEmployee[empKey].hours += entry.hoursWorked;
      if (entry.isBillable) {
        summary.byEmployee[empKey].billable += entry.hoursWorked;
      }
    });

    // Group by project
    entries.forEach((entry) => {
      if (entry.project) {
        const projKey = entry.project.projectCode || entry.project.name;
        if (!summary.byProject[projKey]) {
          summary.byProject[projKey] = {
            name: entry.project.name,
            hours: 0,
            revenue: 0,
          };
        }
        summary.byProject[projKey].hours += entry.hoursWorked;
        summary.byProject[projKey].revenue += entry.billingAmount || 0;
      }
    });

        return {
          entries,
          summary,
          totalCount,
        };
      },
      300 // Cache for 5 minutes
    );

    return NextResponse.json({
      success: true,
      ...data,
      pagination: {
        page,
        limit,
        totalCount: data.totalCount,
        totalPages: Math.ceil(data.totalCount / limit),
        hasMore: skip + data.entries.length < data.totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching timesheet report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timesheet report' },
      { status: 500 }
    );
  }
}
