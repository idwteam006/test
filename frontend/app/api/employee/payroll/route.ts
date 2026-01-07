/**
 * GET /api/employee/payroll - Get employee's payroll records
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get employee
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      // Return empty array if employee record doesn't exist yet
      return NextResponse.json({
        success: true,
        payrollRecords: []
      });
    }

    // Get all payroll records
    const payrollRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId: employee.id,
        tenantId: user.tenantId,
      },
      orderBy: {
        processedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      payrollRecords,
    });
  } catch (error) {
    console.error('[GET /api/employee/payroll] Error:', error);
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
