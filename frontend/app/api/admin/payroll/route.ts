/**
 * GET /api/admin/payroll - Get all payroll records
 * POST /api/admin/payroll - Process payroll for a period
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { getCachedData, CacheTTL, invalidateCache } from '@/lib/cache';

// Cache key helper for payroll records
const getPayrollCacheKey = (tenantId: string, period?: string | null) =>
  `payroll:list:${tenantId}:${period || 'all'}`;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin or Accountant access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    // Create cache key
    const cacheKey = getPayrollCacheKey(user.tenantId, period);

    // Use caching for payroll records (3 min TTL)
    const payrollData = await getCachedData(
      cacheKey,
      async () => fetchPayrollRecords(user.tenantId, period),
      CacheTTL.REPORTS // 3 minutes
    );

    return NextResponse.json({
      success: true,
      ...payrollData,
    });
  } catch (error) {
    console.error('[GET /api/admin/payroll] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payroll records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch payroll records (called by cache layer)
 */
async function fetchPayrollRecords(tenantId: string, period?: string | null) {
    const payrollRecords = await prisma.payrollRecord.findMany({
      where: {
        tenantId,
        ...(period ? { period } : {}),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        processedAt: 'desc',
      },
    });

    return {
      payrollRecords,
    };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin or Accountant access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { employeeId, period, baseSalary, bonuses = 0, deductions = 0 } = body;

    if (!employeeId || !period || baseSalary === undefined) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, period, and base salary are required' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if payroll already exists for this period
    const existingPayroll = await prisma.payrollRecord.findUnique({
      where: {
        employeeId_period: {
          employeeId,
          period,
        },
      },
    });

    if (existingPayroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll already processed for this period' },
        { status: 400 }
      );
    }

    // Calculate net pay
    const netPay = baseSalary + bonuses - deductions;

    // Create payroll record
    const payroll = await prisma.payrollRecord.create({
      data: {
        tenantId: user.tenantId,
        employeeId,
        period,
        baseSalary,
        bonuses,
        deductions,
        netPay,
        processedAt: new Date(),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payroll processed for ${employee.user.firstName} ${employee.user.lastName}`,
      payroll,
    });
  } catch (error) {
    console.error('[POST /api/admin/payroll] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process payroll',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
