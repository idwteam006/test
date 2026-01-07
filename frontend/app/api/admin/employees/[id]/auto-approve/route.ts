/**
 * POST /api/admin/employees/[id]/auto-approve
 * Auto-approve all pending timesheets and expenses for a root-level employee (no manager)
 * Only available for employees who have no manager assigned
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeExpenseApproved } from '@/lib/email-notifications';
import { sendEmail, getTimesheetApprovedEmail } from '@/lib/resend-email';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true, role: true, firstName: true, lastName: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only admins can perform auto-approval
    if (adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get the employee record
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: adminUser.tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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

    // Verify employee has no manager (root level)
    if (employee.managerId !== null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Auto-approval is only available for root-level employees (those with no manager)'
        },
        { status: 400 }
      );
    }

    const results = {
      timesheetsApproved: 0,
      expensesApproved: 0,
    };

    // Auto-approve all SUBMITTED timesheets for this employee
    const submittedTimesheets = await prisma.timesheetEntry.findMany({
      where: {
        userId: employee.userId,
        tenantId: adminUser.tenantId,
        status: 'SUBMITTED',
      },
    });

    if (submittedTimesheets.length > 0) {
      const timesheetResult = await prisma.timesheetEntry.updateMany({
        where: {
          userId: employee.userId,
          tenantId: adminUser.tenantId,
          status: 'SUBMITTED',
        },
        data: {
          status: 'APPROVED',
          approvedBy: adminUser.id,
          approvedAt: new Date(),
        },
      });
      results.timesheetsApproved = timesheetResult.count;

      // Send timesheet approval notification
      if (submittedTimesheets.length > 0) {
        try {
          const totalHours = submittedTimesheets.reduce((sum, t) => sum + t.hoursWorked, 0);
          const firstEntry = submittedTimesheets[0];
          const emailTemplate = getTimesheetApprovedEmail({
            employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
            weekStart: format(startOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
            weekEnd: format(endOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
            totalHours,
          });

          await sendEmail({
            to: employee.user.email,
            ...emailTemplate,
          });
        } catch (emailError) {
          console.error('[Auto-Approve] Failed to send timesheet email:', emailError);
        }
      }
    }

    // Auto-approve all SUBMITTED expenses for this employee
    const submittedExpenses = await prisma.expenseClaim.findMany({
      where: {
        userId: employee.userId,
        tenantId: adminUser.tenantId,
        status: 'SUBMITTED',
      },
    });

    if (submittedExpenses.length > 0) {
      const expenseResult = await prisma.expenseClaim.updateMany({
        where: {
          userId: employee.userId,
          tenantId: adminUser.tenantId,
          status: 'SUBMITTED',
        },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      results.expensesApproved = expenseResult.count;

      // Send expense approval notifications
      for (const expense of submittedExpenses) {
        try {
          await notifyEmployeeExpenseApproved({
            employeeEmail: employee.user.email,
            employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
            expenseTitle: expense.description || 'Expense Claim',
            amount: Number(expense.amount),
            currency: expense.currency || 'USD',
            approvedBy: `${adminUser.firstName} ${adminUser.lastName} (Auto-Approved)`,
          });
        } catch (emailError) {
          console.error('[Auto-Approve] Failed to send expense email:', emailError);
        }
      }
    }

    const totalApproved = results.timesheetsApproved + results.expensesApproved;

    if (totalApproved === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending submissions to approve',
        results,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Auto-approved ${results.timesheetsApproved} timesheet(s) and ${results.expensesApproved} expense(s) for ${employee.user.firstName} ${employee.user.lastName}`,
      results,
      employee: {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
      },
    });
  } catch (error) {
    console.error('[POST /api/admin/employees/[id]/auto-approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to auto-approve submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
