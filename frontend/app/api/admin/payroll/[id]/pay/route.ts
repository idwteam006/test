/**
 * POST /api/admin/payroll/[id]/pay
 * Mark payroll as paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function POST(
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

    if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin or Accountant access required.' },
        { status: 403 }
      );
    }

    // Get payroll record
    const payroll = await prisma.payrollRecord.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll record not found' },
        { status: 404 }
      );
    }

    if (payroll.paidAt) {
      return NextResponse.json(
        { success: false, error: 'Payroll already marked as paid' },
        { status: 400 }
      );
    }

    // Mark as paid
    const updatedPayroll = await prisma.payrollRecord.update({
      where: { id },
      data: {
        paidAt: new Date(),
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
      message: 'Payroll marked as paid',
      payroll: updatedPayroll,
    });
  } catch (error) {
    console.error('[POST /api/admin/payroll/[id]/pay] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark payroll as paid',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
