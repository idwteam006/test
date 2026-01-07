/**
 * POST /api/admin/payroll/bulk-process
 * Process payroll for multiple employees at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

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
    const { period, departmentId } = body;

    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Period is required' },
        { status: 400 }
      );
    }

    // Get all active employees in department (or all if no department specified)
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
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

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found' },
        { status: 404 }
      );
    }

    // Check which employees already have payroll for this period
    const existingPayrolls = await prisma.payrollRecord.findMany({
      where: {
        tenantId: user.tenantId,
        period,
        employeeId: {
          in: employees.map((e) => e.id),
        },
      },
      select: {
        employeeId: true,
      },
    });

    const existingEmployeeIds = new Set(existingPayrolls.map((p) => p.employeeId));

    // Filter out employees who already have payroll
    const employeesToProcess = employees.filter(
      (e) => !existingEmployeeIds.has(e.id)
    );

    if (employeesToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All employees already have payroll for this period' },
        { status: 400 }
      );
    }

    // Create payroll records for all employees
    // Using base salary from employee record (you may want to add a salary field to Employee model)
    const payrollRecords = await prisma.$transaction(
      employeesToProcess.map((employee) => {
        // Default salary - in production, this should come from employee.salary field
        const baseSalary = 5000; // TODO: Get from employee record
        const bonuses = 0;
        const deductions = 0;
        const netPay = baseSalary + bonuses - deductions;

        return prisma.payrollRecord.create({
          data: {
            tenantId: user.tenantId,
            employeeId: employee.id,
            period,
            baseSalary,
            bonuses,
            deductions,
            netPay,
            processedAt: new Date(),
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: `Payroll processed for ${payrollRecords.length} employees`,
      processed: payrollRecords.length,
      skipped: existingEmployeeIds.size,
      payrollRecords,
    });
  } catch (error) {
    console.error('[POST /api/admin/payroll/bulk-process] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk payroll',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
