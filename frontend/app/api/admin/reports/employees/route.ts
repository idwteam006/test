import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { getCachedData, CacheTTL } from '@/lib/cache';

// Cache key helper for employee reports
const getEmployeeReportCacheKey = (tenantId: string, params: string) =>
  `employee:report:${tenantId}:${params}`;

// GET /api/admin/reports/employees - Employee report
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    // Create cache key based on query params
    const cacheKey = getEmployeeReportCacheKey(
      user.tenantId,
      `${status || 'all'}-${departmentId || 'all'}`
    );

    // Use caching for employee reports (5 min TTL)
    const reportData = await getCachedData(
      cacheKey,
      async () => fetchEmployeeReportData(user.tenantId, status, departmentId),
      CacheTTL.MEDIUM // 5 minutes
    );

    return NextResponse.json({
      success: true,
      ...reportData,
    });
  } catch (error) {
    console.error('Error fetching employee report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee report' },
      { status: 500 }
    );
  }
}

/**
 * Fetch employee report data (called by cache layer)
 */
async function fetchEmployeeReportData(
  tenantId: string,
  status: string | null,
  departmentId: string | null
) {
    const where: any = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    const employees = await prisma.employee.findMany({
      where: {
        ...where,
        ...(departmentId && { departmentId }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            employeeId: true,
            createdAt: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const summary = {
      totalEmployees: employees.length,
      byStatus: {
        active: employees.filter((e) => e.status === 'ACTIVE').length,
        inactive: employees.filter((e) => e.status === 'INACTIVE').length,
        terminated: employees.filter((e) => e.status === 'TERMINATED').length,
        onLeave: employees.filter((e) => e.status === 'ON_LEAVE').length,
      },
      byEmploymentType: {
        fullTime: employees.filter((e) => e.employmentType === 'FULL_TIME').length,
        partTime: employees.filter((e) => e.employmentType === 'PART_TIME').length,
        contract: employees.filter((e) => e.employmentType === 'CONTRACT').length,
        intern: employees.filter((e) => e.employmentType === 'INTERN').length,
      },
    };

    return {
      employees,
      summary,
    };
}
