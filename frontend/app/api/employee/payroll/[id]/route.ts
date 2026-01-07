/**
 * GET /api/employee/payroll/[id] - Get specific payroll record details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json(
        { success: false, error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const payroll = await prisma.payrollRecord.findFirst({
      where: {
        id,
        employeeId: employee.id,
        tenantId: user.tenantId,
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payroll,
    });
  } catch (error) {
    console.error('[GET /api/employee/payroll/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payroll record',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
